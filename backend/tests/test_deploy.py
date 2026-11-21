from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_for_the_host():
    assert client.get("/health").json()["status"] == "ok"


def test_cors_allows_our_site_only():
    ok = client.get("/stats", headers={"Origin": "http://localhost:5174"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5174"

    other = client.get("/stats", headers={"Origin": "https://someone-else.example"})
    assert "access-control-allow-origin" not in other.headers