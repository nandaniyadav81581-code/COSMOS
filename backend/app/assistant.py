"""Grounded research assistant: retrieve papers, answer ONLY from them, cite every sentence."""
import logging
import os
import re
from typing import Optional, Protocol

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.corpus import CORPUS
from app.search import ENGINE, analyze

router = APIRouter(tags=["assistant"])
log = logging.getLogger("assistant")

INSUFFICIENT = "The corpus does not contain enough evidence to answer this."
MIN_TOP = 35     # best source below this -> not enough evidence
MIN_SOURCE = 20  # weaker papers are not used as sources
CITE = re.compile(r"\[(\d+)\]")
INDEX = {p["paper_id"]: i for i, p in enumerate(CORPUS.papers)}

Source = tuple[int, dict]  # (citation number, paper)


class Provider(Protocol):
    name: str

    def generate(self, question: str, sources: list[Source]) -> str: ...


def sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if len(s.strip()) > 20]


class ExtractiveProvider:
    """No AI: quotes the best-matching sentences from the sources, word for word."""
    name = "extractive"

    def generate(self, question: str, sources: list[Source]) -> str:
        q = set(analyze(question))
        scored = []
        for n, paper in sources:
            for rank, sentence in enumerate(sentences(paper["abstract"])):
                overlap = len(q & set(analyze(sentence)))
                if overlap:
                    scored.append((overlap, -n, -rank, sentence, n))
        if not scored:
            return INSUFFICIENT
        scored.sort(reverse=True)
        picked, seen = [], set()
        for _, _, _, sentence, n in scored:
            if sentence not in seen:
                seen.add(sentence)
                picked.append(f"{sentence.rstrip('.')} [{n}].")
            if len(picked) == 4:
                break
        return " ".join(picked)


SYSTEM_PROMPT = f"""You answer questions about space-science research using ONLY the numbered sources provided.
- Every factual sentence must end with citations like [1] or [2][3].
- Use only information stated in the sources. Add no outside knowledge.
- If the sources do not address the question, reply with exactly: {INSUFFICIENT}
- Describe what the papers report, not what is true in general. At most about 150 words."""


class ClaudeProvider:
    """Optional: Claude writes the answer. Needs `pip install anthropic` and an ANTHROPIC_API_KEY."""

    def __init__(self, model: str):
        import anthropic  # imported only when this provider is chosen

        self.client = anthropic.Anthropic()
        self.model = model
        self.name = f"claude:{model}"

    def generate(self, question: str, sources: list[Source]) -> str:
        text = "\n\n".join(f"[{n}] {p['title']} ({p['publication_year']})\n{p['abstract']}" for n, p in sources)
        response = self.client.beta.messages.create(
            model=self.model,
            max_tokens=16000,
            output_config={"effort": "medium"},
            # If the model declines, the API retries on a suitable fallback model.
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"Sources:\n\n{text}\n\nQuestion: {question}"}],
        )
        if response.stop_reason == "refusal":
            return INSUFFICIENT
        return "".join(b.text for b in response.content if b.type == "text").strip()


PROVIDER: Provider = (ClaudeProvider(os.getenv("LLM_MODEL", "claude-opus-5-5"))
                      if os.getenv("LLM_PROVIDER") == "anthropic" else ExtractiveProvider())


def verify_citations(answer: str, n_sources: int) -> tuple[str, list[int], dict]:
    """Remove [n] that point at no source; count how much of the answer is cited."""
    valid = lambda n: 1 <= int(n) <= n_sources  # noqa: E731
    invalid = sorted({int(n) for n in CITE.findall(answer) if not valid(n)})
    clean = CITE.sub(lambda m: m.group(0) if valid(m.group(1)) else "", answer)
    clean = re.sub(r"\s+([.,;])", r"\1", clean).strip()
    parts = [s for s in re.split(r"(?<=[.!?])\s+", clean) if s.strip()]
    cited = sorted({int(n) for n in CITE.findall(clean)})
    grounding = {"sentences": len(parts), "cited_sentences": sum(1 for s in parts if CITE.search(s)), "invalid_citations": invalid}
    return clean, cited, grounding


def ask(question: str, paper_id: Optional[str] = None, top_k: int = 6) -> dict:
    interpretation, results = ENGINE.search(question)
    if paper_id is not None:  # a question about one paper uses only that paper
        i = INDEX[paper_id]
        picked = [(i, next((r["relevance"]["overall"] for r in results if r["index"] == i), 0))]
    else:
        picked = [(r["index"], r["relevance"]["overall"]) for r in results[:top_k] if r["relevance"]["overall"] >= MIN_SOURCE]
    sources = [{"n": k + 1, "paper": CORPUS.papers[i], "relevance": rel} for k, (i, rel) in enumerate(picked)]
    base = {"question": question, "interpretation": interpretation, "sources": sources, "provider": PROVIDER.name}
    none = {"sentences": 0, "cited_sentences": 0, "invalid_citations": []}

    if not sources or (paper_id is None and sources[0]["relevance"] < MIN_TOP):
        return {**base, "status": "insufficient_evidence", "answer": INSUFFICIENT, "cited": [], "grounding": none}
    try:
        raw = PROVIDER.generate(question, [(s["n"], s["paper"]) for s in sources])
    except Exception as e:  # a provider/network failure must not crash the API
        log.exception("answer generation failed")
        return {**base, "status": "error", "answer": f"The answer generator failed: {type(e).__name__}.", "cited": [], "grounding": none}
    if INSUFFICIENT in raw:
        return {**base, "status": "insufficient_evidence", "answer": INSUFFICIENT, "cited": [], "grounding": none}
    answer, cited, grounding = verify_citations(raw, len(sources))
    if not cited:  # no valid citation left: not grounded
        return {**base, "status": "insufficient_evidence", "answer": INSUFFICIENT, "cited": [], "grounding": grounding}
    return {**base, "status": "answered", "answer": answer, "cited": cited, "grounding": grounding}


class AskRequest(BaseModel):
    question: str
    paper_id: Optional[str] = None


@router.post("/ask")
def ask_endpoint(req: AskRequest):
    question = req.question.strip()
    if not question or len(question) > 1000:
        raise HTTPException(status_code=422, detail="Question must be 1-1000 characters")
    if req.paper_id is not None and req.paper_id not in INDEX:
        raise HTTPException(status_code=404, detail="Paper not found")
    return ask(question, req.paper_id)
