"""Paper recommendations in three kinds: very similar, related (other approach), adjacent (neighbouring field)."""
from collections import Counter

import numpy as np
from fastapi import APIRouter, HTTPException

from app.corpus import CORPUS
from app.search import ENGINE

router = APIRouter(tags=["recommendations"])
PER_KIND = 6


def jaccard(a: set, b: set) -> float:
    return len(a & b) / len(a | b) if a or b else 0.0


def entities(p: dict) -> set:
    d = p["derived"]
    return set(d["methods"]) | set(d["technologies"]) | set(d["missions"])


def topic_neighbours(papers: list[dict], per_topic: int = 5) -> dict[str, set[str]]:
    """For each topic, the topics that most often appear on the same papers."""
    together: dict[str, Counter] = {}
    for p in papers:
        topics = sorted(set(p["derived"]["topics"]))
        for a in topics:
            for b in topics:
                if a != b:
                    together.setdefault(a, Counter())[b] += 1
    return {t: {x for x, _ in c.most_common(per_topic)} for t, c in together.items()}


NEIGHBOURS = topic_neighbours(CORPUS.papers)
INDEX = {p["paper_id"]: i for i, p in enumerate(CORPUS.papers)}


def reasons(p: dict, c: dict, kind: str, near: set[str]) -> list[str]:
    """Plain-language reasons, built only from facts about the two papers."""
    out = [f"Shares topic: {t}" for t in sorted(set(p["derived"]["topics"]) & set(c["derived"]["topics"]))]
    if kind == "adjacent":
        out += [f"Neighbouring field: {t}" for t in sorted(set(c["derived"]["topics"]) & near)]
    out += [f"Same mission: {m}" for m in sorted(set(p["derived"]["missions"]) & set(c["derived"]["missions"]))]
    out += [f"Also uses {t}" for t in sorted(set(p["derived"]["technologies"]) & set(c["derived"]["technologies"]))]
    pm, cm = set(p["derived"]["methods"]), set(c["derived"]["methods"])
    if pm and cm and not pm & cm:
        out.append(f"Different approach: {', '.join(sorted(cm))}")
    if abs(p["publication_year"] - c["publication_year"]) <= 1:
        out.append("Published within a year")
    return out[:4]


def recommend(paper_id: str) -> dict:
    i = INDEX[paper_id]
    p = CORPUS.papers[i]
    sims = np.clip(ENGINE.vectors @ ENGINE.vectors[i], 0, 1)  # semantic similarity to every paper
    topics, ents, methods = set(p["derived"]["topics"]), entities(p), set(p["derived"]["methods"])
    near = set().union(*(NEIGHBOURS.get(t, set()) for t in topics)) - topics

    kinds: dict[str, list] = {"very_similar": [], "related": [], "adjacent": []}
    for j, c in enumerate(CORPUS.papers):
        if j == i:
            continue
        ct, ce = set(c["derived"]["topics"]), entities(c)
        sig = {
            "semantic": float(sims[j]),
            "topic": jaccard(topics, ct),
            "entity": jaccard(ents, ce),
            "time": max(0.0, 1 - abs(p["publication_year"] - c["publication_year"]) / 5),
        }
        shared = topics & ct
        if len(shared) >= max(1, len(topics) / 2):
            score = 0.6 * sig["semantic"] + 0.25 * sig["topic"] + 0.1 * sig["entity"] + 0.05 * sig["time"]
            kinds["very_similar"].append((score, j, sig))
        elif (shared or ents & ce) and not methods & set(c["derived"]["methods"]):
            score = 0.35 * sig["semantic"] + 0.3 * sig["topic"] + 0.3 * sig["entity"] + 0.05 * sig["time"]
            kinds["related"].append((score, j, sig))
        elif not shared and ct & near:
            score = 0.5 * sig["semantic"] + 0.3 * len(ct & near) / len(ct) + 0.2 * sig["entity"]
            kinds["adjacent"].append((score, j, sig))

    out = {}
    for kind, items in kinds.items():
        items.sort(key=lambda x: -x[0])
        out[kind] = [{
            "paper": CORPUS.papers[j],
            "score": round(100 * score),
            "signals": {name: round(100 * value) for name, value in sig.items()},
            "reasons": reasons(p, CORPUS.papers[j], kind, near),
        } for score, j, sig in items[:PER_KIND]]
    return out


@router.get("/recommendations/{paper_id}")
def recommendations(paper_id: str):
    if paper_id not in INDEX:
        raise HTTPException(status_code=404, detail="Paper not found")
    return recommend(paper_id)
