import json
import tempfile
import unittest
from pathlib import Path

import search


class SearchTests(unittest.TestCase):
    def test_parse_frontmatter(self):
        metadata, body = search.parse_frontmatter(
            '---\ncompany: "Home Depot"\nticker: "HD"\nsource_url: null\n---\n# Report\nBody\n'
        )
        self.assertEqual(metadata["company"], "Home Depot")
        self.assertEqual(metadata["ticker"], "HD")
        self.assertIsNone(metadata["source_url"])
        self.assertEqual(body, "# Report\nBody\n")

    def test_load_company_accepts_exchange_ticker_suffix(self):
        with tempfile.TemporaryDirectory() as temp:
            config = Path(temp) / "companies.json"
            config.write_text(
                json.dumps({"companies": [{"company": "Hays plc", "ticker": "LSE:HAS", "metrics": []}]}),
                encoding="utf-8",
            )
            self.assertEqual(search.load_company(config, "HAS")["company"], "Hays plc")

    def test_search_ranks_relevant_passage_and_preserves_evidence(self):
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            relevant = directory / "relevant.md"
            relevant.write_text(
                '---\ncompany: "Home Depot"\nticker: "HD"\npublished_at: "2026-05-19"\n'
                'document_type: "CALL_TRANSCRIPT"\nperiod: "Q1 2026"\nsource_url: null\n'
                'corpus_frozen_at: "2026-08-14"\n---\n# Earnings call\n\n'
                "Net sales were $41.8 billion. Adjusted diluted EPS was $3.43 for the quarter.\n",
                encoding="utf-8",
            )
            (directory / "irrelevant.md").write_text(
                '---\ncompany: "Home Depot"\nticker: "HD"\npublished_at: "2026-05-18"\n'
                'document_type: "FILING"\nperiod: "Q1 2026"\nsource_url: null\n'
                'corpus_frozen_at: "2026-08-14"\n---\n# Governance\n\nBoard committee membership changed.\n',
                encoding="utf-8",
            )

            matches = search.search_documents(directory, "net sales", limit=3)
            self.assertEqual(len(matches), 1)
            self.assertEqual(matches[0].path, relevant)
            self.assertIn("$41.8 billion", matches[0].numbers)

    def test_search_prefers_a_recent_match_and_centres_the_exact_phrase(self):
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            for year in (2019, 2026):
                (directory / f"{year}.md").write_text(
                    f'---\ncompany: "Deere & Company"\nticker: "DE"\npublished_at: "{year}-02-19"\n'
                    'document_type: "FILING"\nperiod: "Q1"\n---\n# Earnings release\n\n'
                    + ("Introductory material. " * 40)
                    + f"Worldwide net sales and revenues were ${year:,} million.\n",
                    encoding="utf-8",
                )

            matches = search.search_documents(directory, "worldwide net sales and revenues", limit=2)
            self.assertEqual(matches[0].path.name, "2026.md")
            self.assertIn("Worldwide net sales and revenues", matches[0].excerpt)

    def test_render_note_links_to_source_and_warns_results_are_unverified(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / "documents" / "report.md"
            source.parent.mkdir()
            source.write_text("report", encoding="utf-8")
            output = root / "research" / "HD.md"
            match = search.Match(
                path=source,
                title="Quarterly report",
                published_at="2026-05-19",
                document_type="Filing",
                period="Q1 2026",
                score=50,
                excerpt="Net sales were $41.8 billion.",
                numbers=("$41.8 billion",),
            )
            company = {
                "company": "Home Depot",
                "ticker": "HD",
                "period": "FY2026Q2",
                "metrics": [{"label": "Net sales"}],
            }
            note = search.render_note(company, ["Net sales"], {"Net sales": [match]}, output)
            self.assertIn("not verified historical values or forecasts", note)
            self.assertIn("../documents/report.md", note)
            self.assertIn("$41.8 billion", note)


if __name__ == "__main__":
    unittest.main()
