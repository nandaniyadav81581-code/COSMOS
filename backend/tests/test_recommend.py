from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_three_kinds_follow_their_rules():
    src = client.get("/papers/demo-00100").json()
    r = client.get("/recommendations/demo-00100").json()
    assert r["very_similar"] and r["related"] and r["adjacent"]

    ids = [x["paper"]["paper_id"] for kind in r.values() for x in kind]
    assert "demo-00100" not in ids, "never recommend the paper itself"
    assert len(ids) == len(set(ids)), "a paper appears in only one kind"

    topics, methods = set(src["derived"]["topics"]), set(src["derived"]["methods"])
    assert all(topics & set(x["paper"]["derived"]["topics"]) for x in r["very_similar"])
    assert all(not methods & set(x["paper"]["derived"]["methods"]) for x in r["related"])
    assert all(not topics & set(x["paper"]["derived"]["topics"]) for x in r["adjacent"])
    assert all(x["reasons"] for kind in r.values() for x in kind)


def test_unknown_paper_is_404():
    assert client.get("/recommendations/nope").status_code == 404
