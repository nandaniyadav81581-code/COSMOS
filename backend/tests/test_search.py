from fastapi.testclient import TestClient

from app.main import app
from app.search import key_terms, stem

client = TestClient(app)


def test_stemming_joins_word_forms():
    assert stem("detecting") == stem("detection") == "detect"
    assert key_terms("detecting spacecraft faults") == {"detect", "fault"}


def test_question_is_interpreted_and_explained():
    r = client.get("/search", params={"q": "AI techniques for detecting spacecraft faults"}).json()
    assert "Fault Detection" in r["interpretation"]
    first = r["results"][0]["relevance"]
    assert {"overall", "semantic", "keyword", "topic", "entity", "matched_concepts"} <= first.keys()
    scores = [x["relevance"]["overall"] for x in r["results"]]
    assert scores == sorted(scores, reverse=True)


def test_top_results_are_on_topic():
    r = client.get("/search", params={"q": "AI techniques for detecting spacecraft faults", "limit": 10}).json()
    on_topic = sum("Fault Detection" in x["paper"]["derived"]["topics"] for x in r["results"])
    assert on_topic >= 7, f"only {on_topic}/10 top results are about fault detection"


def test_nonsense_finds_nothing():
    assert client.get("/search", params={"q": "zzzz qqqq"}).json()["total"] == 0
