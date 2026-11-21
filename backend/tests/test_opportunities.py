from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_every_signal_follows_the_rules():
    r = client.get("/opportunities", params={"limit": 200}).json()
    assert r["disclaimer"].endswith("not a validated research gap.")
    assert r["items"]
    for o in r["items"]:
        assert o["components"]["gap"] > 0, "only overlaps below what is typical"
        assert o["papers"] == sum(o["per_year"])
        assert all(0 <= v <= 100 for v in o["components"].values())
        if o["papers"] < 3:
            assert o["momentum"] == "too few papers" and o["components"]["momentum"] == 0
    scores = [o["score"] for o in r["items"]]
    assert scores == sorted(scores, reverse=True)


def test_sample_papers_really_combine_both_topics():
    o = client.get("/opportunities").json()["items"][0]
    p = client.get(f"/papers/{o['sample_paper_ids'][0]}").json()
    assert {o["topic_a"], o["topic_b"]} <= set(p["derived"]["topics"])
