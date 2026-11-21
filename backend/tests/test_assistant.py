import re

from fastapi.testclient import TestClient

from app import assistant
from app.main import app

client = TestClient(app)
QUESTION = "What techniques are used to detect spacecraft faults?"


def test_extractive_answer_is_quoted_and_cited():
    r = client.post("/ask", json={"question": QUESTION}).json()
    assert r["status"] == "answered" and r["provider"] == "extractive"
    assert r["cited"] and set(r["cited"]) <= {s["n"] for s in r["sources"]}
    assert r["grounding"]["cited_sentences"] == r["grounding"]["sentences"]
    abstracts = " ".join(s["paper"]["abstract"] for s in r["sources"])
    for sentence in re.split(r"(?<=\])\.\s*", r["answer"]):
        quoted = re.sub(r"\s*\[\d+\]\.?$", "", sentence).strip()
        if quoted:
            assert quoted in abstracts, "every sentence must be copied from a source"


def test_no_evidence_means_no_answer():
    r = client.post("/ask", json={"question": "zzzz qqqq xxyyzz"}).json()
    assert r["status"] == "insufficient_evidence" and r["cited"] == []


def test_question_about_one_paper_uses_only_that_paper():
    r = client.post("/ask", json={"question": "What method does this paper use?", "paper_id": "demo-00100"}).json()
    assert [s["paper"]["paper_id"] for s in r["sources"]] == ["demo-00100"]
    assert client.post("/ask", json={"question": "x", "paper_id": "nope"}).status_code == 404


def test_invalid_citations_are_removed():
    text, cited, g = assistant.verify_citations("A is used [1]. B is reported [7]. C has no source.", n_sources=2)
    assert "[7]" not in text and cited == [1] and g["invalid_citations"] == [7]


class Stub:
    name = "stub"

    def __init__(self, reply: str):
        self.reply = reply

    def generate(self, question, sources):
        return self.reply


def test_an_uncited_answer_is_rejected(monkeypatch):
    monkeypatch.setattr(assistant, "PROVIDER", Stub("Spacecraft use cameras. Trust me [99]."))
    r = client.post("/ask", json={"question": QUESTION}).json()
    assert r["status"] == "insufficient_evidence"
    assert r["grounding"]["invalid_citations"] == [99]
