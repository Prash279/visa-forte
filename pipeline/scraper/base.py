from __future__ import annotations

import time
import logging
from abc import ABC, abstractmethod
from typing import Any, Literal

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

    # Some canada.ca pages sit behind a Cloudflare bot challenge that silently
    # times out plain httpx requests, even with a browser-like User-Agent —
    # confirmed by scripts/update-draw-history.mjs, which only works against
    # the same domain via a real Playwright browser. Set True to fetch this
    # scraper's URL with a headless browser instead of httpx.
    use_browser: bool = False
    # "html" returns the rendered DOM (for BeautifulSoup); "text" returns
    # document.body.innerText — use "text" for raw JSON API endpoints, where
    # the browser wraps the response in its own JSON-viewer HTML.
    browser_extract: Literal["html", "text"] = "html"

    def __init__(self, timeout: int = 60) -> None:
        self._client = httpx.Client(headers=HEADERS, timeout=timeout, follow_redirects=True)

    def __enter__(self) -> "BaseCanadaScraper":
        return self

    def __exit__(self, *_: Any) -> None:
        self._client.close()

    def fetch(self, retries: int = 3) -> str:
        """Fetch self.url with exponential backoff. Returns raw HTML/text."""
        last_exc: Exception | None = None
        for attempt in range(retries):
            try:
                return self._fetch_via_browser() if self.use_browser else self._fetch_via_httpx()
            except Exception as exc:
                last_exc = exc
                wait = 2 ** attempt
                logger.warning("Attempt %d failed for %s: %s — retrying in %ds", attempt + 1, self.url, exc, wait)
                time.sleep(wait)
        raise RuntimeError(f"All {retries} attempts failed for {self.url}") from last_exc

    def _fetch_via_httpx(self) -> str:
        resp = self._client.get(self.url)
        resp.raise_for_status()
        return resp.text

    def _fetch_via_browser(self) -> str:
        # Imported lazily — only scrapers with use_browser=True need Playwright installed.
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                page = browser.new_page(user_agent=HEADERS["User-Agent"])
                page.goto(self.url, wait_until="networkidle", timeout=60_000)
                if self.browser_extract == "text":
                    return page.evaluate("() => document.body.innerText")
                return page.content()
            finally:
                browser.close()

    @abstractmethod
    def parse(self, html: str) -> Any:
        """Parse raw HTML into structured data. Returns None if parsing fails."""
        ...

    def scrape(self) -> Any:
        html = self.fetch()
        return self.parse(html)