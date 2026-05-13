"""
canada.ca monitoring pipeline — orchestrator.
Run locally:  python -m pipeline.main  (from repo root)
Run via CI:   .github/workflows/canada-monitor.yml (every 6 hours)
Exits 1 if any scraper fails, so GitHub Actions marks the run as failed.
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

# Load .env for local runs (no-op in GitHub Actions where env vars are set directly).
# Tries pipeline/.env first, then repo-root .env.local (standard Visa Forte convention).
try:
    from dotenv import load_dotenv
    _repo_root = Path(__file__).parent.parent
    load_dotenv(_repo_root / "apps" / "web" / ".env.local")  # web app env (fallback)
    load_dotenv(_repo_root / ".env.local")                    # repo root (no-override by default)
    load_dotenv(Path(__file__).parent / ".env")               # pipeline-local (highest priority)
except ImportError:
    pass

from pipeline.db import upsert_ee_draws, upsert_snapshot
from pipeline.scraper.ee_draws import EeDrawsScraper
from pipeline.scraper.fee_schedule import FeeScheduleScraper
from pipeline.scraper.processing_times import ProcessingTimesScraper
from pipeline.scraper.proof_of_funds import ProofOfFundsScraper

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("pipeline.main")


def run() -> bool:
    """Run all scrapers. Returns True if every enabled scraper succeeded."""
    failures: list[str] = []

    # --- EE draws (append-only) ---
    try:
        with EeDrawsScraper() as s:
            draws = s.scrape()
        if draws:
            upsert_ee_draws(draws)
        else:
            failures.append("ee_draws: parser returned no data")
    except Exception as exc:
        logger.exception("ee_draws scraper failed: %s", exc)
        failures.append(f"ee_draws: {exc}")

    # --- Processing times (upsert snapshot) ---
    try:
        with ProcessingTimesScraper() as s:
            data = s.scrape()
        if data is not None:
            upsert_snapshot("processing_times", data, ProcessingTimesScraper.url)
        else:
            # SPA page — warn only, not a hard failure
            logger.warning("processing_times: no static data found, snapshot skipped")
    except Exception as exc:
        logger.exception("processing_times scraper failed: %s", exc)
        failures.append(f"processing_times: {exc}")

    # --- Proof of funds / LICO (upsert snapshot) ---
    try:
        with ProofOfFundsScraper() as s:
            data = s.scrape()
        if data:
            upsert_snapshot("proof_of_funds", data, ProofOfFundsScraper.url)
        else:
            failures.append("proof_of_funds: parser returned no data")
    except Exception as exc:
        logger.exception("proof_of_funds scraper failed: %s", exc)
        failures.append(f"proof_of_funds: {exc}")

    # --- Fee schedule (upsert snapshot) ---
    try:
        with FeeScheduleScraper() as s:
            data = s.scrape()
        if data:
            upsert_snapshot("fee_schedule", data, FeeScheduleScraper.url)
        else:
            failures.append("fee_schedule: parser returned no data")
    except Exception as exc:
        logger.exception("fee_schedule scraper failed: %s", exc)
        failures.append(f"fee_schedule: {exc}")

    if failures:
        for msg in failures:
            logger.error("FAILURE — %s", msg)
        return False

    logger.info("All scrapers completed successfully")
    return True


if __name__ == "__main__":
    sys.exit(0 if run() else 1)