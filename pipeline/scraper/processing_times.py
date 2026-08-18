from __future__ import annotations

import json
import logging
import re
from typing import Any

from bs4 import BeautifulSoup

from .base import BaseCanadaScraper

logger = logging.getLogger(__name__)

URL = "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html"

# Known JSON feed pattern embedded in the page script tags
_JSON_FEED_RE = re.compile(r"var\s+processingData\s*=\s*(\{.+?\});", re.DOTALL)


def _extract_from_script(html: str) -> dict[str, Any] | None:
    """Try to find embedded JSON data in <script> tags."""
    m = _JSON_FEED_RE.search(html)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError as exc:
        logger.warning("Script-tag JSON parse failed: %s", exc)
        return None


def _extract_from_table(html: str) -> list[dict[str, Any]] | None:
    """Fallback: parse static <table> rows for processing time entries."""
    soup = BeautifulSoup(html, "lxml")
    table = soup.find("table")
    if table is None:
        return None

    programs: list[dict[str, Any]] = []
    for row in table.find_all("tr")[1:]:
        cells = [td.get_text(strip=True) for td in row.find_all(["td", "th"])]
        if len(cells) < 2:
            continue
        label = cells[0]
        raw_text = cells[1]
        # Try to extract a numeric month value from text like "6 months" or "3-6 months"
        m = re.search(r"(\d+)", raw_text)
        months = int(m.group(1)) if m else None
        key = re.sub(r"\s+", "_", label.lower())[:60]
        programs.append({"id": key, "label": label, "months": months, "rawText": raw_text})

    return programs if programs else None


class ProcessingTimesScraper(BaseCanadaScraper):
    url = URL
    use_browser = True

    def parse(self, html: str) -> dict[str, Any] | None:
        # Attempt 1: embedded JSON in script tags
        script_data = _extract_from_script(html)
        if script_data is not None:
            logger.info("Processing times extracted from script-tag JSON")
            return script_data

        # Attempt 2: static HTML table fallback
        table_data = _extract_from_table(html)
        if table_data is not None:
            logger.info("Processing times extracted from static table (%d rows)", len(table_data))
            return {"programs": table_data}

        # Page is a JavaScript SPA — cannot parse without a browser
        logger.warning(
            "Processing times page appears to be a JS SPA — no static data found. "
            "Snapshot will not be updated this run."
        )
        return None