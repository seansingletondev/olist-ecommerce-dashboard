"""
export_to_json.py

Runs every SQL analysis query in sql/queries/ against Postgres and writes
each result to its own JSON file in dashboard/public/data/, so the
TypeScript/D3 dashboard can read pre-computed data instead of needing a live
database connection at runtime (see ARCHITECTURE.md's "Data Flow" section).

Because Phase 2 split sql/queries/ so that every .sql file holds exactly one
runnable query (no multi-statement files, no review-only LIMITs), this
script can stay generic: it just runs whatever .sql files it finds and
names each output JSON file after its source .sql file. There's nothing to
update here when a query file is added, removed, or renamed.

Usage:
    python export_to_json.py

Requires the SAME .env file python/ingest/load_to_postgres.py uses (see
python/ingest/.env.example) -- both scripts talk to the same Neon database,
so there's only one connection string to create and keep up to date,
instead of two copies that could drift out of sync.
"""

import datetime
import json
import os
from decimal import Decimal
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text


# ----------------------------------------------------------------------------
# Setup
# ----------------------------------------------------------------------------

# Path(__file__).resolve().parents[2] walks up from this file (export/ ->
# python/ -> project root), same trick load_to_postgres.py uses -- makes the
# script work no matter what directory it's run from.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
QUERIES_DIR = PROJECT_ROOT / "sql" / "queries"
OUTPUT_DIR = PROJECT_ROOT / "dashboard" / "public" / "data"

# Deliberately pointing at ingest's .env rather than having our own copy --
# see the module docstring above for why.
load_dotenv(PROJECT_ROOT / "python" / "ingest" / ".env")
DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL)


# ----------------------------------------------------------------------------
# JSON serialization helpers
# ----------------------------------------------------------------------------

def json_default(value):
    """
    json.dump only natively knows how to write a handful of Python types
    (str, int, float, bool, None, list, dict) -- anything else needs to be
    told HOW to turn into one of those, via this "default" hook that
    json.dump calls whenever it hits a type it doesn't recognize.

    Postgres NUMERIC columns (e.g. every ROUND(...) result in our queries)
    come back from the database as Python's Decimal type -- exact decimal
    arithmetic, not a plain float -- which json.dump can't serialize as-is.
    Postgres TIMESTAMP columns come back as Python datetime objects, also
    not natively JSON-serializable. So: Decimal becomes a plain float (JSON
    has no decimal type anyway), and date/datetime becomes an ISO 8601
    string ("2018-06-15T00:00:00"), the standard way to represent a
    timestamp as JSON text -- JavaScript's Date can parse that format
    directly, which matters since the dashboard is TypeScript.
    """
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime.date, datetime.datetime)):
        return value.isoformat()
    raise TypeError(f"Don't know how to JSON-serialize {type(value)}: {value!r}")


def run_query(sql_path: Path) -> list[dict]:
    """
    Reads one .sql file's full contents and runs it as a single query.
    pandas.read_sql() sends that text to Postgres and returns the result as
    a DataFrame; to_dict(orient="records") reshapes it into a list of plain
    dicts, one per row, keyed by column name -- exactly the shape a JSON
    array of objects needs (e.g. [{"month": ..., "total_revenue": ...}, ...]).
    """
    sql_text = sql_path.read_text(encoding="utf-8")
    df = pd.read_sql(text(sql_text), engine)
    return df.to_dict(orient="records")


# ----------------------------------------------------------------------------
# Entry point
# ----------------------------------------------------------------------------

def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    sql_files = sorted(QUERIES_DIR.glob("*.sql"))
    print(f"Found {len(sql_files)} query file(s) in {QUERIES_DIR.relative_to(PROJECT_ROOT)}")

    for sql_path in sql_files:
        rows = run_query(sql_path)

        output_path = OUTPUT_DIR / f"{sql_path.stem}.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(rows, f, default=json_default, indent=2)

        print(f"  {sql_path.name} -> {output_path.relative_to(PROJECT_ROOT)} ({len(rows):,} rows)")

    print("Done.")


if __name__ == "__main__":
    main()
