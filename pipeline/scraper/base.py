from __future__ import annotations

import time
import logging
from abc import ABC, abstractmethod
from typing import Any

import httpx

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-CA,en;q=0.9",
}


class BaseCanadaScraper(ABC):
    url: str

    def __init__(self, timeout: int = 60) -> None:
        self._client = httpx.Client(headers=HEADERS, timeout=timeout, follow_redirects=True)

    def __enter__(self) -> "BaseCanadaScraper":
        return self

    def __exit__(self, *_: Any) -> None:
        self._client.close()

    def fetch(self, retries: int = 3) -> str:
        """Fetch self.url with exponential backoff. Returns raw HTML."""
        last_exc: Exception | None = None
        for attempt in range(retries):
            try:
                resp = self._client.get(self.url)
                resp.raise_for_status()
                return resp.text
            except httpx.HTTPError as exc:
                last_exc = exc
                wait = 2 ** attempt
                logger.warning("Attempt %d failed for %s: %s — retrying in %ds", attempt + 1, self.url, exc, wait)
                time.sleep(wait)
        raise RuntimeError(f"All {retries} attempts failed for {self.url}") from last_exc

    @abstractmethod
    def parse(self, html: str) -> Any:
        """Parse raw HTML into structured data. Returns None if parsing fails."""
        ...

    def scrape(self) -> Any:
        html = self.fetch()
        return self.parse(html)