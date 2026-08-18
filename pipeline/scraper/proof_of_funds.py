from __future__ import annotations

import logging
import re
from typing import Any

from bs4 import BeautifulSoup

from .base import BaseCanadaScraper

logger = logging.getLogger(__name__)

URL = "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/proof-funds.html"


def _clean_int(raw: str) -> int:
    return int(re.sub(r"[,$\s]", "", raw.strip()))


class ProofOfFundsScraper(BaseCanadaScraper):
    url = URL
    use_browser = True

    def parse(self, html: str) -> dict[str, Any] | None:
        soup = BeautifulSoup(html, "lxml")
        table = soup.find("table")
        if table is None:
            logger.error("Proof of funds table not found")
            return None

        by_family_size: dict[str, int] = {}
        extra_per_member: int | None = None

        rows = table.find_all("tr")
        for row in rows[1:]:
            cells = [td.get_text(strip=True) for td in row.find_all(["td", "th"])]
            if len(cells) < 2:
                continue
            size_text = cells[0].strip()
            amount_text = cells[1].strip()
            try:
                amount = _clean_int(amount_text)
            except ValueError:
                logger.warning("Cannot parse amount '%s' — skipping row", amount_text)
                continue

            # Row for additional family members (not a fixed size)
            if re.search(r"each additional|extra|additional", size_text, re.IGNORECASE):
                extra_per_member = amount
            else:
                # Extract the numeric family size
                m = re.search(r"\d+", size_text)
                if m:
                    by_family_size[m.group()] = amount

        if not by_family_size:
            logger.error("No family-size rows parsed from proof-of-funds table")
            return None

        result: dict[str, Any] = {"byFamilySize": by_family_size}
        if extra_per_member is not None:
            result["extraPerMember"] = extra_per_member

        logger.info("Parsed proof-of-funds: %d family sizes", len(by_family_size))
        return result