"""Research evolution: is each topic's SHARE of the corpus rising or falling?"""
import math

from fastapi import APIRouter, Query

from app.corpus import CORPUS, slug

router = APIRouter(tags=["trends"])


def classify(growth: float, z: float, recent: int) -> str:
    """Corpus signals, worded carefully. Not judgements of scientific importance."""
    if growth >= 1.5 and z >= 2 and recent >= 5:
        return "emerging"
    if growth >= 1.15 and z >= 1:
        return "growing"
    if growth <= 0.75 and z <= -1.5:
        return "declining"
    return "stable"


def slope(xs: list[int], ys: list[int]) -> float:
    """Least-squares straight line through the points: papers per year, per year."""
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    den = sum((x - mx) ** 2 for x in xs)
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / den if den else 0.0


def per_year(papers: list[dict]) -> list[int]:
    counts = {y: 0 for y in CORPUS.years}
    for p in papers:
        counts[p["publication_year"]] += 1
    return [counts[y] for y in CORPUS.years]


def report(recent_years: int = 3) -> dict:
    years = CORPUS.years
    window = max(1, min(recent_years, len(years) - 2))
    n_base = len(years) - window
    totals = per_year(CORPUS.papers)
    corpus_growth = (sum(totals[n_base:]) / window) / (sum(totals[:n_base]) / n_base)

    topics = []
    for name in CORPUS.topics:
        counts = per_year([p for p in CORPUS.papers if name in p["derived"]["topics"]])
        base, recent = sum(counts[:n_base]), sum(counts[n_base:])
        base_rate = base / n_base
        expected = base_rate * window * corpus_growth  # what the topic's old share predicts
        growth = ((recent / window) / base_rate) / corpus_growth if base_rate else (99.0 if recent else 1.0)
        z = (recent - expected) / math.sqrt(max(expected, 1.0))
        topics.append({
            "topic": name, "topic_id": slug(name), "per_year": counts, "total": base + recent, "recent": recent,
            "growth": round(growth, 2), "z": round(z, 2), "slope": round(slope(years, counts), 2),
            "status": classify(growth, z, recent),
        })
    topics.sort(key=lambda t: -t["z"])
    return {"years": years, "recent_years": window, "corpus_growth": round(corpus_growth, 2), "totals": totals, "topics": topics}


@router.get("/trends")
def trends(recent_years: int = Query(3, ge=1, le=6)):
    return report(recent_years)
