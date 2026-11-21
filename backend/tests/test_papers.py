from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    assert client.get("/health").json()["status"] == "ok"


def test_stats_match_the_corpus():
    s = client.get("/stats").json()
    assert s["papers"] == 1500
    assert s["year_from"] <= s["year_to"]
    assert s["synthetic"] is True


def test_filters_really_filter():
    r = client.get(
        "/papers",
        params={"country": "India", "topic": "Computer Vision"}
    ).json()

    assert r["total"] > 0

    for p in r["items"]:
        assert p["country"] == "India"
        assert "Computer Vision" in p["derived"]["topics"]


def test_unknown_paper_is_404():
    assert client.get("/papers/does-not-exist").status_code == 404