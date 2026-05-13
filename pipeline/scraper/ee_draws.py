from __future__ import annotations

import logging
import re
from typing import Any

from .base import BaseCanadaScraper

logger = logging.getLogger(__name__)

# Direct JSON feed powering the WET data-wb-json table on the ministerial instructions page.
# Fields used: drawDate (ISO), drawName (type), drawSize (invitations), drawCRS (cutoff).
URL = "https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json"


def _clean_int(raw: str) -> int:
    """Strip commas and whitespace, convert to int."""
    return int(re.sub(r"[,\s]", "", raw.strip()))


class EeDrawsScraper(BaseCanadaScraper):
    url = URL

    def parse(self, html: str) -> list[dict[str, Any]] | None:
        # This endpoint returns JSON, not HTML — the base class fetch() returns raw text.
        import json
        try:
            data = json.loads(html)
        except json.JSONDecodeError as exc:
            logger.error("Failed to parse EE draws JSON: %s", exc)
            return None

        rounds = data.get("rounds")
        if not rounds:
            logger.error("'rounds' key missing from EE draws JSON")
            return None

        draws: list[dict[str, Any]] = []
        for rd in rounds:
            try:
                draws.append({
                    "draw_date": rd["drawDate"],           # already ISO: "2026-05-11"
                    "draw_type": rd["drawName"],
                    "cutoff_score": _clean_int(rd["drawCRS"]),
                    "invitations": _clean_int(rd["drawSize"]),
                })
            except (KeyError, ValueError) as exc:
                logger.warning("Skipping malformed round %s: %s", rd.get("drawNumber"), exc)

        logger.info("Parsed %d EE draw rounds", len(draws))
        return draws if draws else None