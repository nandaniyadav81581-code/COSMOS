import argparse
import csv
import json
import re
import hashlib
from collections import Counter
from pathlib import Path


BACKEND = Path(__file__).resolve().parents[2]
DATA_DIR = BACKEND / "data"

ALIASES = {
    "paper_id": ["paper_id", "id", "uid"],
    "title": ["title", "paper_title"],
    "abstract": ["abstract", "summary", "text"],
    "year": ["year", "publication_year"],
    "date": ["date", "publication_date"],
    "doi": ["doi"],
    "country": ["affiliation_country", "country"],
    "organizations": ["institutions", "organizations", "affiliations"],
    "topics": ["topics", "topic"],
    "methods": ["methods", "method"],
}

COUNTRIES = {
    "usa": "United States",
    "u.s.": "United States",
    "u.s.a.": "United States",
    "united states of america": "United States",
    "uk": "United Kingdom",
    "u.k.": "United Kingdom",
}


def clean(value):
    return str(value or "").strip()


def normalize_title(value):
    return re.sub(r"[^a-z0-9]", "", clean(value).lower())


def normalize_doi(value):
    value = clean(value).lower()
    value = re.sub(
        r"^https?://(dx\.)?doi\.org/",
        "",
        value
    )
    return value.strip()


def parse_list(value):
    value = clean(value)

    if not value:
        return []

    try:
        parsed = json.loads(value)

        if isinstance(parsed, list):
            return [clean(x) for x in parsed if clean(x)]

    except (json.JSONDecodeError, TypeError):
        pass

    separator = "|" if "|" in value else ";"

    return [
        item.strip()
        for item in value.split(separator)
        if item.strip()
    ]


def load_taxonomy():
    path = DATA_DIR / "taxonomy.json"

    taxonomy = json.loads(
        path.read_text(encoding="utf-8")
    )

    topics = {
        topic
        for domain in taxonomy.get("domains", [])
        for topic in domain.get("topics", [])
    }

    return taxonomy, topics


def find_columns(headers):
    normalized = {
        header.lower().strip(): header
        for header in headers
    }

    result = {}

    for field, aliases in ALIASES.items():
        for alias in aliases:
            if alias in normalized:
                result[field] = normalized[alias]
                break

    return result


def run_import(source, dry_run=False, mapping=None, out="imported_data"):

    source = Path(source)

    with source.open(
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as file:

        reader = csv.DictReader(file)
        rows = list(reader)
        headers = reader.fieldnames or []

    columns = find_columns(headers)

    if mapping:
        columns.update(mapping)

    for required in ("title", "abstract"):
        if required not in columns:
            raise ValueError(
                f"No column found for required field '{required}'. "
                "Use --map to specify it."
            )

    taxonomy, known_topics = load_taxonomy()

    known_countries = {
        item["name"]
        for item in taxonomy.get("countries", [])
    }

    output = []

    skipped = Counter()
    unknown_countries = Counter()
    unknown_topics = Counter()

    seen_titles = set()
    seen_dois = set()

    duplicates = 0

    for index, row in enumerate(rows, start=1):

        title = clean(row.get(columns["title"]))
        abstract = clean(row.get(columns["abstract"]))

        year_value = clean(
            row.get(columns.get("year", ""))
        )

        date_value = clean(
            row.get(columns.get("date", ""))
        )

        if not year_value and date_value:
            year_value = date_value[:4]

        if not title:
            skipped["no title"] += 1
            continue

        if not abstract:
            skipped["no abstract"] += 1
            continue

        try:
            year = int(float(year_value))

        except (ValueError, TypeError):
            skipped["no year"] += 1
            continue

        if year < 1950 or year > 2100:
            skipped["invalid year"] += 1
            continue

        doi = clean(
            row.get(columns.get("doi", ""))
        )

        doi_key = normalize_doi(doi)
        title_key = normalize_title(title)

        if (
            title_key in seen_titles
            or (doi_key and doi_key in seen_dois)
        ):
            duplicates += 1
            continue

        seen_titles.add(title_key)

        if doi_key:
            seen_dois.add(doi_key)

        country = clean(
            row.get(columns.get("country", ""))
        )

        if country:
            normalized_country = COUNTRIES.get(
                country.lower(),
                country
            )

            if normalized_country not in known_countries:
                unknown_countries[country] += 1

        else:
            normalized_country = None

        organizations = parse_list(
            row.get(columns.get("organizations", ""))
        )

        topics = parse_list(
            row.get(columns.get("topics", ""))
        )

        methods = parse_list(
            row.get(columns.get("methods", ""))
        )

        valid_topics = []

        for topic in topics:

            if topic in known_topics:
                valid_topics.append(topic)

            else:
                unknown_topics[topic] += 1

                if "Other topics" not in valid_topics:
                    valid_topics.append("Other topics")

        paper = {
            "paper_id": clean(
                row.get(columns.get("paper_id", ""))
            ) or f"imported-{index}",

            "title": title,
            "abstract": abstract,
            "authors": [],

            "publication_date": date_value or f"{year}-01-01",
            "publication_year": year,

            "journal": None,
            "conference": None,
            "publisher": None,

            "doi": doi or None,
            "source_url": None,
            "open_access_url": None,

            "country": normalized_country,
            "organizations": organizations,

            "citation_count": None,
            "reference_count": None,
            "research_type": None,

            "derived": {
                "topics": valid_topics,
                "subtopics": [],
                "missions": [],
                "spacecraft": [],
                "technologies": [],
                "methods": methods,
                "entities": [],
                "keywords": [],
                "embedding_reference": None,
            },

            "is_synthetic": False,
        }

        output.append(paper)

    # Add Other topics to a copied taxonomy if needed.
    output_taxonomy = json.loads(
        json.dumps(taxonomy)
    )

    if unknown_topics:

        other_domain = {
            "id": "other",
            "name": "Other Topics",
            "icon": "📚",
            "topics": ["Other topics"],
        }

        output_taxonomy["domains"].append(other_domain)

    report = {
        "rows_in": len(rows),
        "papers_out": len(output),
        "skipped": dict(skipped),
        "duplicates_removed": duplicates,
        "columns_used": columns,
        "countries_without_iso_code": dict(unknown_countries),
        "topics_outside_taxonomy": dict(unknown_topics),
    }

    print(json.dumps(
        report,
        indent=2,
        ensure_ascii=False
    ))

    if dry_run:
        print("\nDry run: nothing written.")
        return output, report

    # Create output folder only for a real import.
    output_dir = Path(out)

    if not output_dir.is_absolute():
        output_dir = BACKEND / output_dir

    output_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    # Write papers.
    (output_dir / "papers.json").write_text(
        json.dumps(output, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )

    # Write taxonomy.
    (output_dir / "taxonomy.json").write_text(
        json.dumps(
            output_taxonomy,
            indent=2,
            ensure_ascii=False
        ),
        encoding="utf-8"
    )

    # Create manifest.
    manifest = {
        "source_file": source.name,
        "rows_in": len(rows),
        "papers_out": len(output),
        "duplicates_removed": duplicates,
        "is_synthetic": False,
        "importer": "COSMOS",
    }

    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2),
        encoding="utf-8"
    )

    # Save validation report.
    (output_dir / "report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )

    print(f"\nImport complete. Files written to: {output_dir}")

    return output, report


def main():

    parser = argparse.ArgumentParser(
        description="COSMOS research paper importer"
    )

    parser.add_argument(
        "input",
        help="Input CSV file"
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate data without writing files"
    )

    parser.add_argument(
        "--map",
        help="JSON mapping of fields to CSV columns"
    )

    parser.add_argument(
        "--out",
        default="imported_data",
        help="Output folder for imported data"
    )

    args = parser.parse_args()

    mapping = json.loads(args.map) if args.map else None

    run_import(
        args.input,
        dry_run=args.dry_run,
        mapping=mapping,
        out=args.out
    )


if __name__ == "__main__":
    main()