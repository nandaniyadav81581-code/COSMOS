"""Research opportunities: topic pairs that are close in meaning but share few papers.
Corpus-derived discovery signals for human investigation, NOT validated research gaps."""
from itertools import combinations

import numpy as np
from fastapi import APIRouter, Query

from app.corpus import CORPUS, slug
from app.search import ENGINE
from app.trends import per_year

router = APIRouter(tags=["opportunities"])

DISCLAIMER = "This is a corpus-derived discovery signal, not a validated research gap."
MIN_PARENT = 20          # both topics need at least this many papers
MIN_MOMENTUM_PAPERS = 3  # below this, a trend is noise
FULL_EVIDENCE = 8        # momentum counts fully from this many papers
WINDOW = 3               # recent years
WEIGHTS = {"closeness": 0.4, "gap": 0.35, "momentum": 0.15, "foundation": 0.1}

MEMBERS = {t: {i for i, p in enumerate(CORPUS.papers) if t in p["derived"]["topics"]} for t in CORPUS.topics}


def centroid(indices: set[int]):
    """Average embedding of some papers, scaled to length 1 (None if there are none)."""
    if not indices:
        return None
    v = ENGINE.vectors[sorted(indices)].mean(axis=0)
    n = np.linalg.norm(v)
    return v / n if n else None


def compute() -> list[dict]:
    papers, years = CORPUS.papers, CORPUS.years
    n_base = len(years) - WINDOW
    totals = per_year(papers)
    corpus_growth = (sum(totals[n_base:]) / WINDOW) / (sum(totals[:n_base]) / n_base)
    topics = [t for t in CORPUS.topics if len(MEMBERS[t]) >= MIN_PARENT]
    biggest = max(len(MEMBERS[t]) for t in topics)

    rows = []
    for a, b in combinations(topics, 2):
        A, B = MEMBERS[a], MEMBERS[b]
        both = A & B
        ca, cb = centroid(A - both), centroid(B - both)
        counts = per_year([papers[i] for i in both])
        base, recent = sum(counts[:n_base]), sum(counts[n_base:])
        if len(both) < MIN_MOMENTUM_PAPERS:
            momentum, mom = "too few papers", 0.0
        elif base == 0:
            momentum, mom = "new", 1.0
        else:
            ratio = ((recent / WINDOW) / (base / n_base)) / corpus_growth
            momentum = "increasing" if ratio >= 1.25 else "decreasing" if ratio <= 0.8 else "steady"
            mom = min(1.0, max(0.0, (ratio - 0.5) / 1.5))
        rows.append({
            "a": a, "b": b, "both": both, "counts": counts, "recent": recent, "momentum": momentum,
            "close": float(ca @ cb) if ca is not None and cb is not None else 0.0,
            "indep": len(A) * len(B) / len(papers),
            "mom": mom * min(1.0, len(both) / FULL_EVIDENCE),
            "found": min(len(A), len(B)) / biggest,
        })

    # Regression across ALL pairs: what overlap is typical at each closeness?
    close = np.array([r["close"] for r in rows])
    y = np.array([np.log((len(r["both"]) + 0.5) / r["indep"]) for r in rows])
    beta, alpha = np.polyfit(close, y, 1)
    fitted = alpha + beta * close
    sd = float(np.std(y - fitted)) or 1.0
    lo, hi = close.min(), close.max()

    out = []
    for k, r in enumerate(rows):
        parts = {
            "closeness": float((r["close"] - lo) / (hi - lo)) if hi > lo else 0.0,
            "gap": float(min(1.0, max(0.0, -(y[k] - fitted[k]) / (2 * sd)))),
            "momentum": r["mom"],
            "foundation": r["found"],
        }
        newest_first = sorted(r["both"], key=lambda i: papers[i]["publication_date"], reverse=True)
        out.append({
            "id": f"{slug(r['a'])}|{slug(r['b'])}",
            "topic_a": r["a"], "topic_b": r["b"],
            "papers": len(r["both"]),
            "typical": round(max(0.0, float(np.exp(fitted[k]) * r["indep"] - 0.5)), 1),
            "recent": r["recent"], "momentum": r["momentum"], "per_year": r["counts"],
            "score": round(100 * sum(WEIGHTS[name] * value for name, value in parts.items())),
            "components": {name: round(100 * value) for name, value in parts.items()},
            "sample_paper_ids": [papers[i]["paper_id"] for i in newest_first[:5]],
        })
    return sorted(out, key=lambda o: -o["score"])


# The corpus is fixed, so we score every pair once at startup.
OPPORTUNITIES = compute()


@router.get("/opportunities")
def opportunities(limit: int = Query(24, ge=1, le=200), min_papers: int = Query(1, ge=1)):
    """Under-explored intersections: overlap below what is typical for topics this close."""
    items = [o for o in OPPORTUNITIES if o["components"]["gap"] > 0 and o["papers"] >= min_papers]
    return {"disclaimer": DISCLAIMER, "total": len(items), "items": items[:limit]}
