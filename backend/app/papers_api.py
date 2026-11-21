"""Endpoints for corpus statistics and browsing papers. Mirrors the frontend's DataSource contract."""
from collections import Counter
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.corpus import CORPUS

router = APIRouter(tags=["papers"])


class Stats(BaseModel):
    papers: int
    countries: int
    topics: int
    organizations: int
    year_from: int
    year_to: int
    synthetic: bool


def count_values(values) -> list[dict]:
    """How often each value appears, most common first."""
    return [{"value": v, "count": n} for v, n in Counter(values).most_common()]


@router.get("/stats", response_model=Stats)
def stats():
    ps = CORPUS.papers
    return Stats(
        papers=len(ps),
        countries=len({p["country"] for p in ps if p["country"]}),
        topics=len({t for p in ps for t in p["derived"]["topics"]}),
        organizations=len({o for p in ps for o in p["organizations"]}),
        year_from=CORPUS.years[0],
        year_to=CORPUS.years[-1],
        synthetic=any(p["is_synthetic"] for p in ps),
    )


@router.get("/taxonomy")
def taxonomy():
    return {"domains": CORPUS.taxonomy["domains"], "countries": CORPUS.taxonomy["countries"]}


@router.get("/domains")
def domains():
    return [
        {**d, "paper_count": sum(1 for p in CORPUS.papers if set(p["derived"]["topics"]) & set(d["topics"]))}
        for d in CORPUS.taxonomy["domains"]
    ]


@router.get("/countries")
def countries():
    out = []
    for c in CORPUS.taxonomy["countries"]:
        mine = [p for p in CORPUS.papers if p["country"] == c["name"]]
        top = Counter(t for p in mine for t in p["derived"]["topics"]).most_common(3)
        out.append({**c, "paper_count": len(mine), "top_topics": [t for t, _ in top]})
    return sorted(out, key=lambda c: -c["paper_count"])


# Fixed addresses must come BEFORE "/papers/{paper_id}".
@router.get("/papers/recent")
def recent(limit: int = Query(6, ge=1, le=50)):
    return sorted(CORPUS.papers, key=lambda p: p["publication_date"], reverse=True)[:limit]


@router.get("/papers/facets")
def facets():
    return {
        "topics": count_values(t for p in CORPUS.papers for t in p["derived"]["topics"]),
        "countries": count_values(p["country"] for p in CORPUS.papers if p["country"]),
    }


@router.get("/papers")
def query_papers(
    q: str = "",
    topic: Optional[str] = None,
    country: Optional[str] = None,
    sort: Literal["newest", "oldest", "title"] = "newest",
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
):
    words = q.lower().split()
    rows = [
        p for p in CORPUS.papers
        if (not topic or topic in p["derived"]["topics"])
        and (not country or p["country"] == country)
        and all(w in f"{p['title']} {p['abstract']}".lower() for w in words)
    ]
    if sort == "title":
        rows.sort(key=lambda p: p["title"])
    else:
        rows.sort(key=lambda p: p["publication_date"], reverse=(sort == "newest"))
    start = (page - 1) * page_size
    return {"items": rows[start:start + page_size], "total": len(rows), "page": page, "page_size": page_size}


@router.get("/papers/{paper_id}")
def get_paper(paper_id: str):
    paper = CORPUS.by_id.get(paper_id)
    if paper is None:
        raise HTTPException(status_code=404, detail="Paper not found")
    return paper