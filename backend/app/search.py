"""Semantic search: TF-IDF + LSA embeddings, a hybrid ranking, and an explanation for every result."""
import re

import numpy as np
from fastapi import APIRouter, Query
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, TfidfVectorizer

from app.corpus import CORPUS

router = APIRouter(tags=["search"])

TOKEN = re.compile(r"[a-z0-9]+")
SUFFIXES = ("ations", "ation", "ions", "ion", "ings", "ing", "ers", "er", "ies", "es", "ed", "s")
# Words that say how a question is asked, not what it is about.
QUESTION_WORDS = {"what", "how", "which", "used", "using", "techniques", "research", "researchers",
                  "working", "being", "make", "becoming", "space", "spacecraft"}
WEIGHTS = {"semantic": 0.5, "keyword": 0.2, "topic": 0.2, "entity": 0.1}
MIN_SCORE = 18  # below this a paper is not a match


def stem(word: str) -> str:
    """Cut a common ending: detecting -> detect, faults -> fault, detection -> detect."""
    for suffix in SUFFIXES:
        if word.endswith(suffix) and len(word) - len(suffix) >= 3:
            return word[: -len(suffix)] + ("y" if suffix == "ies" else "")
    return word


def analyze(text: str) -> list[str]:
    """Words for TF-IDF: lowercase, no stop words, stemmed, plus neighbouring pairs."""
    words = [stem(w) for w in TOKEN.findall(text.lower()) if w not in ENGLISH_STOP_WORDS and len(w) > 1]
    return words + [f"{a} {b}" for a, b in zip(words, words[1:])]


def key_terms(text: str) -> set[str]:
    """The stemmed content words of a question or a label."""
    return {stem(w) for w in TOKEN.findall(text.lower())
            if len(w) > 2 and w not in ENGLISH_STOP_WORDS and w not in QUESTION_WORDS}


def paper_text(p: dict) -> str:
    d = p["derived"]
    return " ".join([p["title"], p["abstract"], *d["topics"], *d["methods"], *d["technologies"], *d["missions"]])


def unit(m: np.ndarray) -> np.ndarray:
    """Scale every row to length 1, so a dot product is the cosine similarity."""
    n = np.linalg.norm(m, axis=1, keepdims=True)
    return m / np.where(n == 0, 1, n)


class SearchEngine:
    def __init__(self, papers: list[dict], topics: list[str], dims: int = 128):
        self.papers, self.topics = papers, topics
        texts = [paper_text(p) for p in papers]
        # 1. TF-IDF: one long, mostly-zero vector per paper (rows already have length 1).
        self.tfidf = TfidfVectorizer(analyzer=analyze, sublinear_tf=True)
        self.sparse = self.tfidf.fit_transform(texts)
        # 2. LSA: squeeze to `dims` numbers per paper. Words that appear together end up close.
        k = max(2, min(dims, self.sparse.shape[1] - 1, len(papers) - 1))
        self.svd = TruncatedSVD(n_components=k, random_state=0)
        self.vectors = unit(self.svd.fit_transform(self.sparse))
        self.topic_vectors = self.embed(topics)
        self.entity_terms = [key_terms(" ".join(p["derived"]["methods"] + p["derived"]["technologies"] + p["derived"]["missions"]))
                             for p in papers]

    def embed(self, texts: list[str]) -> np.ndarray:
        """LSA embeddings for new text, in the same space as the papers."""
        return unit(self.svd.transform(self.tfidf.transform(texts)))

    def interpret(self, query: str, qv: np.ndarray, k: int = 4) -> list[str]:
        """Which taxonomy topics is the question about? Meaning (60%) + shared words (40%)."""
        q = key_terms(query)
        scored = []
        for topic, sim in zip(self.topics, self.topic_vectors @ qv):
            t = key_terms(topic)
            shared = len(t & q) / len(t) if t else 0.0
            scored.append((0.6 * float(sim) + 0.4 * shared, topic))
        scored.sort(reverse=True)
        best = scored[0][0] if scored else 0.0
        return [topic for score, topic in scored[:k] if score >= 0.3 and score >= 0.6 * best]

    def search(self, query: str) -> tuple[list[str], list[dict]]:
        qv = self.embed([query])[0]
        interpretation = self.interpret(query, qv)
        q = key_terms(query)
        semantic = np.clip(self.vectors @ qv, 0, 1)
        keyword = (self.sparse @ self.tfidf.transform([query]).T).toarray().ravel()
        keyword = keyword / (keyword.max() or 1)  # best keyword match = 1.0

        results = []
        for i, p in enumerate(self.papers):
            on_topics = [t for t in interpretation if t in p["derived"]["topics"]]
            parts = {
                "semantic": float(semantic[i]),
                "keyword": float(keyword[i]),
                "topic": len(on_topics) / len(interpretation) if interpretation else 0.0,
                "entity": min(1.0, len(q & self.entity_terms[i]) / len(q)) if q else 0.0,
            }
            overall = round(100 * sum(WEIGHTS[name] * value for name, value in parts.items()))
            if overall < MIN_SCORE:
                continue
            things = p["derived"]["methods"] + p["derived"]["technologies"] + p["derived"]["missions"]
            concepts = on_topics + [x for x in things if key_terms(x) & q]
            results.append({"index": i, "relevance": {
                "overall": overall,
                **{name: round(100 * value) for name, value in parts.items()},
                "matched_concepts": list(dict.fromkeys(concepts))[:4],
            }})
        results.sort(key=lambda r: -r["relevance"]["overall"])
        return interpretation, results


# Built once when the API starts (takes a second or two).
ENGINE = SearchEngine(CORPUS.papers, CORPUS.topics)


@router.get("/search")
def search(q: str = Query(..., min_length=1, max_length=500), limit: int = Query(20, ge=1, le=100)):
    interpretation, results = ENGINE.search(q)
    return {
        "query": q,
        "interpretation": interpretation,
        "total": len(results),
        "results": [{"paper": CORPUS.papers[r["index"]], "relevance": r["relevance"]} for r in results[:limit]],
    }
