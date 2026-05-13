from __future__ import annotations

import logging
import re
from typing import Any

from bs4 import BeautifulSoup

from .base import BaseCanadaScraper

logger = logging.getLogger(__name__)

URL = "https://ircc.canada.ca/english/information/fees/fees.asp"


def _clean_amount(raw: str) -> float:
    """Extract the first dollar amount from raw cell text.
    Handles trailing text like 'increased April 30, 2026' or '(per child)'."""
    m = re.search(r"[\d,]+\.?\d*", raw)
    if not m:
        raise ValueError(f"No numeric value in: {raw!r}")
    return float(m.group().replace(",", ""))


class FeeScheduleScraper(BaseCanadaScraper):
    url = URL

    def parse(self, html: str) -> dict[str, Any] | None:
        soup = BeautifulSoup(html, "lxml")
        tables = soup.find_all("table")
        if not tables:
            logger.error("No fee tables found on fee-schedule page")
            return None

        fees: dict[str, Any] = {}
        for table in tables:
            # Use the preceding heading as the section label
            heading_tag = table.find_previous(["h2", "h3", "h4"])
            section_label = heading_tag.get_text(strip=True) if heading_tag else "general"
            section_key = re.sub(r"\s+", "_", section_label.lower())[:60]

            rows = table.find_all("tr")
            section: dict[str, float] = {}
            for row in rows[1:]:
                cells = [td.get_text(strip=True) for td in row.find_all(["td", "th"])]
                if len(cells) < 2:
                    continue
                label = cells[0].strip()
                amount_text = cells[-1]  # last cell is typically the fee amount
                try:
                    amount = _clean_amount(amount_text)
                    fee_key = re.sub(r"\s+", "_", label.lower())[:80]
                    section[fee_key] = amount
                except ValueError:
                    logger.warning("Cannot parse fee '%s' from '%s' — skipping", amount_text, label)

            if section:
                fees[section_key] = section

        if not fees:
            logger.error("No fee rows parsed from fee-schedule page")
            return None

        logger.info("Parsed fee schedule: %d sections", len(fees))
        return fees