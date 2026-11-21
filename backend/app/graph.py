"""Knowledge graph: entities linked by the papers they share, expanded one node at a time."""
from collections import Counter, defaultdict

from fastapi import APIRouter, HTTPException

from app.corpus import CORPUS, slug

router = APIRouter(tags=["graph"])
PER_KIND = 4  # strongest neighbours kept per kind: keeps the map readable


def entities_of(p: dict) -> dict[str, tuple[str, str]]:
    """Every node a paper touches: id -> (kind, label)."""
    out = {}
    for t in p["derived"]["topics"]:
        out[f"topic:{slug(t)}"] = ("topic", t)
        for d in CORPUS.taxonomy["domains"]:
            if t in d["topics"]:
                out[f"domain:{d['id']}"] = ("domain", d["name"])
    if p["country"]:
        out[f"country:{slug(p['country'])}"] = ("country", p["country"])
    for kind, field in (("mission", "missions"), ("technology", "technologies"), ("method", "methods")):
        for value in p["derived"][field]:
            out[f"{kind}:{slug(value)}"] = (kind, value)
    return out


# Built once at startup: which entities each paper has, and which papers each entity has.
PAPER_ENTITIES = [entities_of(p) for p in CORPUS.papers]
META: dict[str, tuple[str, str]] = {}
PAPERS_OF: dict[str, list[int]] = defaultdict(list)
for i, ents in enumerate(PAPER_ENTITIES):
    for eid, meta in ents.items():
        META[eid] = meta
        PAPERS_OF[eid].append(i)


def node(eid: str) -> dict:
    if eid == "root":
        return {"id": "root", "kind": "root", "label": "Space Research", "paper_count": len(CORPUS.papers)}
    kind, label = META[eid]
    return {"id": eid, "kind": kind, "label": label, "paper_count": len(PAPERS_OF[eid])}


def neighbourhood(eid: str) -> dict:
    if eid == "root":
        domains = [node(f"domain:{d['id']}") for d in CORPUS.taxonomy["domains"] if f"domain:{d['id']}" in META]
        return {"center": node("root"), "neighbours": [{**d, "weight": d["paper_count"]} for d in domains]}

    center = node(eid)
    own_topics = set()
    if center["kind"] == "domain":
        domain = next(d for d in CORPUS.taxonomy["domains"] if f"domain:{d['id']}" == eid)
        own_topics = {f"topic:{slug(t)}" for t in domain["topics"]}

    # How many papers each other entity shares with this one.
    shared = Counter(x for i in PAPERS_OF[eid] for x in PAPER_ENTITIES[i] if x != eid)
    kept, neighbours = Counter(), []
    for x, weight in shared.most_common():
        kind = META[x][0]
        if center["kind"] == "domain" and kind in ("domain", "topic"):
            if x in own_topics:  # a domain expands into exactly its own topics
                neighbours.append({**node(x), "weight": weight})
            continue
        if kept[kind] < PER_KIND:
            kept[kind] += 1
            neighbours.append({**node(x), "weight": weight})
    return {"center": center, "neighbours": neighbours}


@router.get("/graph/{entity_id}")
def graph(entity_id: str):
    if entity_id != "root" and entity_id not in META:
        raise HTTPException(status_code=404, detail=f"No entity '{entity_id}'")
    return neighbourhood(entity_id)
