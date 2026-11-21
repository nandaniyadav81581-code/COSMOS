from collections import Counter

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_shows_domains():
    r = client.get("/graph/root").json()
    assert r["center"]["id"] == "root"
    assert {n["kind"] for n in r["neighbours"]} == {"domain"}


def test_domain_expands_into_its_own_topics():
    r = client.get("/graph/domain:ai").json()
    topics = {n["label"] for n in r["neighbours"] if n["kind"] == "topic"}
    assert topics == {"Machine Learning", "Computer Vision", "Fault Detection", "Mission Planning", "Onboard AI"}


def test_neighbours_are_capped_and_weighted():
    r = client.get("/graph/topic:computer-vision").json()
    per_kind = Counter(n["kind"] for n in r["neighbours"])
    assert all(count <= 4 for count in per_kind.values()), "at most 4 per kind: no hairball"
    assert all(0 < n["weight"] <= r["center"]["paper_count"] for n in r["neighbours"])


def test_unknown_entity_is_404():
    assert client.get("/graph/topic:nope").status_code == 404
