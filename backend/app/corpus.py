"""Loads the fixed research corpus once, when the API starts. No scraping, no daily downloads."""
import json
import os
import re
from pathlib import Path

# Lesson 18 points this at real data with the COSMOS_DATA_DIR environment variable.
DATA_DIR = Path(os.getenv("COSMOS_DATA_DIR", Path(__file__).resolve().parent.parent / "data"))


def slug(text: str) -> str:
    """'Computer Vision' -> 'computer-vision' (safe for ids and addresses)."""
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", text.lower()))


class Corpus:
    def __init__(self, folder: Path):
        self.papers: list[dict] = json.loads((folder / "papers.json").read_text(encoding="utf-8"))
        self.taxonomy: dict = json.loads((folder / "taxonomy.json").read_text(encoding="utf-8"))
        self.by_id = {p["paper_id"]: p for p in self.papers}
        self.topics = [t for d in self.taxonomy["domains"] for t in d["topics"]]
        years = [p["publication_year"] for p in self.papers]
        self.years = list(range(min(years), max(years) + 1))


# Loaded once, shared by every endpoint.
CORPUS = Corpus(DATA_DIR)