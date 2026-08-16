#!/usr/bin/env python3
"""Search the supplied company documents and write a cited Markdown research note."""

from __future__ import annotations

import argparse
import heapq
import json
import os
import re
import textwrap
from dataclasses import dataclass
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CONFIG = REPO_ROOT / "challenge" / "companies.json"
DEFAULT_DOCUMENT_ROOT = REPO_ROOT / "challenge" / "offline-data"
WORD_RE = re.compile(r"[a-z0-9]+", re.IGNORECASE)
NUMBER_RE = re.compile(
    r"(?<![\w])(?:[$£€]\s*)?\(?-?\d(?:[\d,]*\d)?(?:\.\d+)?"
    r"(?:\s*(?:%|million|billion|m|bn|per share))?\)?",
    re.IGNORECASE,
)
STOP_WORDS = {"a", "an", "and", "company", "for", "of", "the", "to", "total"}


@dataclass(frozen=True)
class Match:
    path: Path
    title: str
    published_at: str
    document_type: str
    period: str
    score: int
    excerpt: str
    numbers: tuple[str, ...]


def parse_frontmatter(text: str) -> tuple[dict[str, object], str]:
    """Parse the small JSON-compatible YAML header used by the supplied documents."""
    if not text.startswith("---\n"):
        return {}, text
    marker = text.find("\n---\n", 4)
    if marker == -1:
        return {}, text

    metadata: dict[str, object] = {}
    for line in text[4:marker].splitlines():
        if ":" not in line:
            continue
        key, raw_value = line.split(":", 1)
        raw_value = raw_value.strip()
        try:
            metadata[key.strip()] = json.loads(raw_value)
        except json.JSONDecodeError:
            metadata[key.strip()] = raw_value
    return metadata, text[marker + 5 :]


def load_company(config_path: Path, selector: str) -> dict[str, object]:
    payload = json.loads(config_path.read_text(encoding="utf-8"))
    companies = payload.get("companies", [])
    wanted = selector.strip().casefold()
    matches = []
    for company in companies:
        ticker = str(company.get("ticker", ""))
        identifiers = {
            ticker.casefold(),
            ticker.rsplit(":", 1)[-1].casefold(),
            str(company.get("company", "")).casefold(),
        }
        if wanted in identifiers:
            matches.append(company)
    if len(matches) != 1:
        available = ", ".join(str(item.get("ticker")) for item in companies)
        raise ValueError(f"Company '{selector}' was not found. Available tickers: {available}")
    return matches[0]


def document_identity(path: Path) -> tuple[str, str]:
    with path.open("r", encoding="utf-8") as handle:
        prefix = handle.read(2048)
    metadata, _ = parse_frontmatter(prefix)
    return str(metadata.get("company", "")), str(metadata.get("ticker", ""))


def find_document_directory(root: Path, company: dict[str, object]) -> Path:
    expected_name = str(company["company"]).casefold()
    expected_ticker = str(company["ticker"]).casefold()
    for directory in sorted(path for path in root.iterdir() if path.is_dir()):
        sample = next(
            (path for path in directory.rglob("*.md") if path.name not in {"INDEX.md", "README.md"}),
            None,
        )
        if sample is None:
            continue
        name, ticker = document_identity(sample)
        if name.casefold() == expected_name or ticker.casefold() == expected_ticker:
            return directory
    raise ValueError(f"No document directory found for {company['company']} under {root}")


def query_terms(query: str) -> tuple[str, ...]:
    terms = {word.casefold() for word in WORD_RE.findall(query)} - STOP_WORDS
    if not terms:
        raise ValueError(f"Query '{query}' does not contain any searchable terms")
    return tuple(sorted(terms))


def make_excerpt(
    block: str, terms: tuple[str, ...], phrase: str | None = None, width: int = 650
) -> str:
    flat = re.sub(r"\s+", " ", block).strip()
    lowered = flat.casefold()
    phrase_position = lowered.find(phrase) if phrase else -1
    positions = [lowered.find(term) for term in terms if lowered.find(term) >= 0]
    centre = phrase_position if phrase_position >= 0 else (positions[0] if positions else 0)
    start = max(0, centre - width // 4)
    end = min(len(flat), start + width)
    prefix = "…" if start else ""
    suffix = "…" if end < len(flat) else ""
    return f"{prefix}{flat[start:end].strip()}{suffix}"


def numbers_in(text: str) -> tuple[str, ...]:
    unique = []
    for value in NUMBER_RE.findall(text):
        cleaned = re.sub(r"\s+", " ", value).strip()
        cleaned = re.sub(r"([$£€])\s+", r"\1", cleaned)
        if cleaned not in unique:
            unique.append(cleaned)
    return tuple(unique[:12])


def search_documents(directory: Path, query: str, limit: int = 5) -> list[Match]:
    terms = query_terms(query)
    phrase = re.sub(r"\s+", " ", query).strip().casefold()
    heap: list[tuple[int, str, int, Match]] = []
    serial = 0

    paths = sorted(
        path for path in directory.rglob("*.md") if path.name not in {"INDEX.md", "README.md"}
    )
    for path in paths:
        metadata, body = parse_frontmatter(path.read_text(encoding="utf-8"))
        title_match = re.search(r"^#\s+(.+)$", body, re.MULTILINE)
        title = title_match.group(1).strip() if title_match else path.stem
        for block in re.split(r"\n\s*\n", body):
            flat = re.sub(r"\s+", " ", block).strip()
            if len(flat) < 30:
                continue
            lowered = flat.casefold()
            matched = [term for term in terms if re.search(rf"\b{re.escape(term)}\b", lowered)]
            required = 1 if len(terms) == 1 else max(2, (len(terms) + 1) // 2)
            if len(matched) < required:
                continue
            occurrences = sum(min(len(re.findall(rf"\b{re.escape(term)}\b", lowered)), 3) for term in matched)
            score = len(matched) * 20 + occurrences * 2 + (35 if phrase in lowered else 0)
            published_at = str(metadata.get("published_at") or "")
            year_match = re.match(r"(\d{4})", published_at)
            if year_match:
                score += min(max(int(year_match.group(1)) - 2018, 0) * 3, 24)
            excerpt = make_excerpt(flat, tuple(matched), phrase if phrase in lowered else None)
            numbers = numbers_in(excerpt)
            if any(any(marker in value for marker in ("$", "£", "€", "%", ".")) for value in numbers):
                score += 12
            match = Match(
                path=path,
                title=title,
                published_at=published_at,
                document_type=str(metadata.get("document_type") or "Document").replace("_", " ").title(),
                period=str(metadata.get("period") or ""),
                score=score,
                excerpt=excerpt,
                numbers=numbers,
            )
            serial += 1
            heapq.heappush(heap, (score, match.published_at, serial, match))
            if len(heap) > limit * 6:
                heapq.heappop(heap)

    ranked = [item[3] for item in sorted(heap, reverse=True)]
    selected: list[Match] = []
    per_document: dict[Path, int] = {}
    for match in ranked:
        if per_document.get(match.path, 0) >= 2:
            continue
        selected.append(match)
        per_document[match.path] = per_document.get(match.path, 0) + 1
        if len(selected) == limit:
            break
    return selected


def render_note(
    company: dict[str, object], queries: list[str], results: dict[str, list[Match]], output_path: Path
) -> str:
    metrics = ", ".join(str(metric["label"]) for metric in company.get("metrics", []))
    lines = [
        f"# Research matches: {company['company']}",
        "",
        f"**Ticker:** {company['ticker']}  ",
        f"**Challenge period:** {company['period']}  ",
        f"**Challenge metrics:** {metrics}",
        "",
        "These are search results, not verified historical values or forecasts. Check every figure in context.",
    ]
    for query in queries:
        lines.extend(["", f"## {query}", ""])
        matches = results[query]
        if not matches:
            lines.append("No sufficiently strong matches found.")
            continue
        for index, match in enumerate(matches, start=1):
            relative = Path(os.path.relpath(match.path, output_path.parent)).as_posix()
            lines.extend(
                [
                    f"### {index}. {match.title}",
                    "",
                    f"- **Document:** [{match.path.name}]({relative})",
                    f"- **Published:** {match.published_at or 'Unknown'}",
                    f"- **Type:** {match.document_type}",
                    f"- **Period:** {match.period or 'Unknown'}",
                    f"- **Candidate figures in excerpt:** {', '.join(match.numbers) or 'None detected'}",
                    "",
                    "> " + textwrap.fill(match.excerpt, width=110).replace("\n", "\n> "),
                    "",
                ]
            )
    return "\n".join(lines).rstrip() + "\n"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--company", required=True, help="Company ticker or exact company name")
    parser.add_argument("--query", action="append", help="Search query; repeat for multiple queries")
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--documents", type=Path, help="Company document directory; detected when omitted")
    parser.add_argument("--document-root", type=Path, default=DEFAULT_DOCUMENT_ROOT)
    parser.add_argument("--output", type=Path, help="Markdown output path")
    parser.add_argument("--max-results", type=int, default=5, help="Results per query")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.max_results < 1 or args.max_results > 20:
        raise SystemExit("--max-results must be between 1 and 20")
    try:
        company = load_company(args.config, args.company)
        directory = args.documents or find_document_directory(args.document_root, company)
        queries = args.query or [str(metric["label"]) for metric in company.get("metrics", [])]
        output = args.output or REPO_ROOT / "research" / f"{str(company['ticker']).replace(':', '-')}.md"
        results = {query: search_documents(directory, query, args.max_results) for query in queries}
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(render_note(company, queries, results, output), encoding="utf-8")
    except (FileNotFoundError, KeyError, ValueError, json.JSONDecodeError) as exc:
        raise SystemExit(f"Error: {exc}") from exc
    print(f"Wrote research note: {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
