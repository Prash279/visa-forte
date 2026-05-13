from __future__ import annotations

import logging
import os
from typing import Any

import psycopg2
import psycopg2.extras

logger = logging.getLogger(__name__)


def _get_conn() -> "psycopg2.connection":
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL environment variable is not set")
    # psycopg2 requires the postgresql:// scheme; Neon supplies postgres://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    # Neon requires SSL — append if the URL doesn't already specify it
    if "sslmode=" not in url:
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}sslmode=require"
    return psycopg2.connect(url)


def upsert_ee_draws(draws: list[dict[str, Any]]) -> int:
    """Insert new EE draw rows. Existing (draw_date, draw_type) pairs are silently skipped.
    Returns count of rows actually inserted."""
    if not draws:
        return 0

    sql = """
        INSERT INTO ee_draws (draw_date, draw_type, cutoff_score, invitations)
        VALUES (%(draw_date)s, %(draw_type)s, %(cutoff_score)s, %(invitations)s)
        ON CONFLICT (draw_date, draw_type) DO NOTHING
    """

    inserted = 0
    with _get_conn() as conn:
        with conn.cursor() as cur:
            for draw in draws:
                cur.execute(sql, draw)
                inserted += cur.rowcount
        conn.commit()

    logger.info("ee_draws: %d new rows inserted (of %d)", inserted, len(draws))
    return inserted


def upsert_snapshot(data_key: str, payload: Any, source_url: str) -> None:
    """Insert or update a canada_data_snapshots row for the given data_key."""
    sql = """
        INSERT INTO canada_data_snapshots (data_key, payload, source_url, last_scraped)
        VALUES (%s, %s, %s, NOW())
        ON CONFLICT (data_key) DO UPDATE
            SET payload      = EXCLUDED.payload,
                source_url   = EXCLUDED.source_url,
                last_scraped = EXCLUDED.last_scraped
    """
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (data_key, psycopg2.extras.Json(payload), source_url))
        conn.commit()

    logger.info("canada_data_snapshots: upserted key '%s'", data_key)