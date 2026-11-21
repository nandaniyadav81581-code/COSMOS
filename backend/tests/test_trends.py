from fastapi.testclient import TestClient

from app.main import app
from app.trends import classify

client = TestClient(app)


def test_rules():
    assert classify(2.0, 3.0, 10) == "emerging"
    assert classify(2.0, 3.0, 2) == "growing"   # too few papers to call it emerging
    assert classify(1.0, 0.0, 10) == "stable"
    assert classify(0.5, -2.0, 3) == "declining"


def test_report_adds_up():
    r = client.get("/trends").json()
    assert r["recent_years"] == 3 and len(r["totals"]) == len(r["years"])
    for t in r["topics"]:
        assert t["total"] == sum(t["per_year"])
        assert t["recent"] == sum(t["per_year"][-3:])
    zs = [t["z"] for t in r["topics"]]
    assert zs == sorted(zs, reverse=True)


def test_skewed_demo_topic_is_detected():
    # The demo generator deliberately makes "Onboard AI" more common in recent years.
    by_name = {t["topic"]: t for t in client.get("/trends").json()["topics"]}
    assert by_name["Onboard AI"]["status"] in {"emerging", "growing"}
    assert by_name["Onboard AI"]["slope"] > 0
