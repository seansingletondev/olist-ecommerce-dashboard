"""
load_to_postgres.py

Loads the 9 raw Olist CSVs (in datasets/) into the Postgres tables defined by
sql/schema.sql, hosted on Neon.

IMPORTANT: this script does NOT create tables. Run sql/schema.sql against your
Neon database first (see sql/SQL_GUIDE.md section 12). This script only INSERTs
rows into tables that already exist -- schema.sql is DDL (defines structure),
this script is DML (moves data).

Usage:
    python load_to_postgres.py

Requires a ".env" file in this same folder (see ".env.example") with a
DATABASE_URL pointing at your Neon database.
"""

from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import os


# ----------------------------------------------------------------------------
# Setup
# ----------------------------------------------------------------------------

# load_dotenv() reads the ".env" file in this folder and copies its key=value
# pairs into the process's environment variables, so os.environ can see them.
# This keeps the real connection string (with your password in it) out of the
# script itself and out of git -- only ".env.example" (no secrets) is committed.
load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]

# Path(__file__) is this script's own file path. .resolve() makes it absolute,
# .parents[2] walks up two directory levels (ingest/ -> python/ -> project
# root), and then we go back down into datasets/. Using this instead of a
# hardcoded path means the script works no matter what directory you run it
# from.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATASETS_DIR = PROJECT_ROOT / "datasets"

# create_engine() doesn't actually connect yet -- it just prepares a
# connection factory. SQLAlchemy (and pandas' to_sql, under the hood) will
# open real connections from this engine as needed and return them to a pool
# when done, rather than us managing raw psycopg2 connections by hand.
engine = create_engine(DATABASE_URL)

# How many rows to send to Postgres per INSERT statement. Sending all ~1
# million geolocation rows in a single INSERT would build one enormous SQL
# statement and risk hitting Postgres's limit on parameters per query,
# so pandas batches the work into chunks of this size instead.
CHUNK_SIZE = 5_000


# ----------------------------------------------------------------------------
# Small helpers reused across every table
# ----------------------------------------------------------------------------

def read_csv(filename: str, **kwargs) -> pd.DataFrame:
    """
    Thin wrapper around pd.read_csv with the settings every one of our files
    needs.

    encoding="utf-8-sig" instead of plain "utf-8": one CSV
    (product_category_name_translation.csv) starts with a BOM (Byte Order
    Mark) -- a few invisible bytes some tools prepend to mark a file as
    UTF-8. Plain "utf-8" would leave those bytes stuck onto the first column
    name, silently breaking any code that refers to it by name. "utf-8-sig"
    strips the BOM if present and behaves like normal utf-8 if it's not --
    safe to use everywhere.
    """
    return pd.read_csv(DATASETS_DIR / filename, encoding="utf-8-sig", **kwargs)


def clean_for_insert(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normalizes "no value" so every missing cell becomes Python's actual
    None, which SQLAlchemy/psycopg2 always translate to SQL NULL correctly.

    Why this is necessary: pandas represents missing data several different
    ways depending on column type -- float NaN, pandas' own NaT ("not a
    time") for dates, or pd.NA for nullable integer columns. Left as-is,
    some of those (especially NaN) can get passed to Postgres as the literal
    string "NaN" instead of NULL, which a column typed INTEGER or TIMESTAMP
    will reject outright.

    df.where(cond, None) keeps a cell's existing value wherever `cond` is
    True, and replaces it with None wherever `cond` is False. pd.notnull(df)
    is True for real values and False for any of NaN/NaT/pd.NA. So this line
    reads as: "keep every real value, replace every kind of missing value
    with None." Casting to `object` dtype first is what allows a column that
    was numeric to hold Python's None instead of being forced back into NaN.
    """
    return df.astype(object).where(pd.notnull(df), None)


def load_table(df: pd.DataFrame, table_name: str) -> None:
    """
    Inserts every row of df into an existing Postgres table.

    if_exists="append": the table already exists (created by schema.sql) --
    we're adding rows to it, never creating or replacing the table itself.

    index=False: pandas DataFrames have their own row index (0, 1, 2, ...)
    used for lookups in Python. That index isn't part of our data and isn't
    a column in schema.sql, so we don't want it written as an extra column.

    method="multi": batches multiple rows into a single INSERT statement
    (INSERT INTO t VALUES (row1), (row2), ...) instead of sending one
    INSERT per row. This is dramatically faster over a network connection
    like Neon's, since it avoids a full network round-trip per row.

    chunksize=CHUNK_SIZE: how many rows go into each of those batched
    INSERT statements -- see CHUNK_SIZE's comment above for why this is
    capped rather than sending everything in one giant statement.
    """
    row_count = len(df)
    df.to_sql(
        table_name,
        con=engine,
        if_exists="append",
        index=False,
        method="multi",
        chunksize=CHUNK_SIZE,
    )
    print(f"  loaded {row_count:,} rows into {table_name}")


# ----------------------------------------------------------------------------
# Per-table loaders
#
# Each function reads one CSV, applies whatever cleaning that specific table
# needs (renaming misspelled columns, parsing dates, fixing types), and hands
# the result to load_table(). They're listed below in the SAME order as
# CREATE TABLE statements in schema.sql -- parent tables (customers, sellers,
# product_category_translation, products) before the tables whose FOREIGN
# KEYs point at them (orders, order_items, order_payments, order_reviews).
# Loading a child table before its parent exists would make every foreign
# key check fail, since Postgres would have nothing to check the values
# against yet.
# ----------------------------------------------------------------------------

def load_customers() -> None:
    df = read_csv("olist_customers_dataset.csv")
    load_table(clean_for_insert(df), "customers")


def load_sellers() -> None:
    df = read_csv("olist_sellers_dataset.csv")
    load_table(clean_for_insert(df), "sellers")


def load_category_translation() -> None:
    df = read_csv("product_category_name_translation.csv")
    load_table(clean_for_insert(df), "product_category_translation")


def load_products() -> None:
    df = read_csv("olist_products_dataset.csv")

    # The source file misspells these two columns ("lenght" instead of
    # "length"). schema.sql intentionally spells them correctly, so we
    # rename them here to match -- this is the one place that typo gets
    # fixed, keeping the database itself clean even though the raw CSV isn't.
    df = df.rename(columns={
        "product_name_lenght": "product_name_length",
        "product_description_lenght": "product_description_length",
    })

    # These numeric columns are legitimately missing for some real products
    # (schema.sql leaves them nullable for exactly this reason). Casting to
    # pandas' "Int64" (capital I -- the *nullable* integer dtype, different
    # from plain lowercase "int64") lets a column hold whole numbers AND
    # missing values at the same time, which plain int64 can't do. Without
    # this cast, pandas would silently store these as floats (e.g. 500.0
    # instead of 500) because a column with any NaN gets upgraded to float
    # automatically -- and schema.sql defines these columns as INTEGER, not
    # a decimal type.
    nullable_int_columns = [
        "product_name_length",
        "product_description_length",
        "product_photos_qty",
        "product_weight_g",
        "product_length_cm",
        "product_height_cm",
        "product_width_cm",
    ]
    for col in nullable_int_columns:
        df[col] = df[col].astype("Int64")

    load_table(clean_for_insert(df), "products")


def load_orders() -> None:
    df = read_csv("olist_orders_dataset.csv")

    # These columns are text in the raw CSV (e.g. "2017-10-02 10:56:33") but
    # schema.sql types them as TIMESTAMP. pd.to_datetime() parses each one
    # into an actual datetime value. errors="coerce" means: if any row has a
    # value that can't be parsed as a date, turn it into NaT ("not a time")
    # instead of crashing the whole load -- clean_for_insert() then turns
    # that NaT into None/NULL like any other missing value. Several of these
    # are legitimately blank in the source data (e.g. a cancelled order has
    # no delivered_carrier_date) -- that's real, not a parsing failure.
    timestamp_columns = [
        "order_purchase_timestamp",
        "order_approved_at",
        "order_delivered_carrier_date",
        "order_delivered_customer_date",
        "order_estimated_delivery_date",
    ]
    for col in timestamp_columns:
        df[col] = pd.to_datetime(df[col], errors="coerce")

    load_table(clean_for_insert(df), "orders")


def load_order_items() -> None:
    df = read_csv("olist_order_items_dataset.csv")
    df["shipping_limit_date"] = pd.to_datetime(df["shipping_limit_date"], errors="coerce")
    load_table(clean_for_insert(df), "order_items")


def load_order_payments() -> None:
    df = read_csv("olist_order_payments_dataset.csv")
    load_table(clean_for_insert(df), "order_payments")


def load_order_reviews() -> None:
    df = read_csv("olist_order_reviews_dataset.csv")

    # Same reasoning as orders' timestamp columns above.
    df["review_creation_date"] = pd.to_datetime(df["review_creation_date"], errors="coerce")
    df["review_answer_timestamp"] = pd.to_datetime(df["review_answer_timestamp"], errors="coerce")

    # Note what's deliberately absent here: this dataframe still has a
    # review_id column that repeats for ~941 reviews (confirmed by checking
    # the raw CSV before writing schema.sql), which is exactly why
    # schema.sql gives this table its own auto-generated review_pk instead
    # of using review_id as the primary key. We don't need to do anything
    # special for that here -- we simply never mention review_pk in this
    # dataframe at all, and Postgres's BIGSERIAL generates it automatically
    # for every inserted row.
    load_table(clean_for_insert(df), "order_reviews")


def load_geolocation() -> None:
    # This is the largest file (~1,000,000 rows), so it's worth loading in
    # chunks even at the pandas level, not just at the SQL-insert level: with
    # chunksize= set on read_csv, pandas gives us an iterator over pieces of
    # the file instead of loading and holding the entire CSV in memory at
    # once. We insert each piece into Postgres as it's read.
    total = 0
    for chunk in read_csv("olist_geolocation_dataset.csv", chunksize=CHUNK_SIZE):
        load_table(clean_for_insert(chunk), "geolocation")
        total += len(chunk)
    print(f"  geolocation total: {total:,} rows")


# ----------------------------------------------------------------------------
# Reset: empty every table before reloading
#
# This makes the script safe to re-run from scratch (e.g. after fixing a bug
# in one of the loaders above) without ending up with duplicate rows.
# ----------------------------------------------------------------------------

# Reverse of the load order: we must delete CHILD rows (the ones with a
# FOREIGN KEY pointing outward) before their PARENT rows, or Postgres will
# refuse the delete -- a customers row can't be removed while an orders row
# still references it, for example.
TABLES_NEWEST_FIRST = [
    "geolocation",
    "order_reviews",
    "order_payments",
    "order_items",
    "orders",
    "products",
    "product_category_translation",
    "sellers",
    "customers",
]


def reset_tables() -> None:
    print("Clearing existing rows (if any)...")
    with engine.begin() as conn:
        # engine.begin() opens a connection AND wraps everything inside this
        # `with` block in a single transaction: if any statement below
        # fails, every TRUNCATE in this block is rolled back together rather
        # than leaving the database half-emptied.
        for table in TABLES_NEWEST_FIRST:
            # TRUNCATE empties a table (like DELETE with no WHERE clause) but
            # is much faster for large tables, since it doesn't log every
            # individual row deletion the way DELETE does.
            conn.execute(text(f"TRUNCATE TABLE {table}"))
    print("  done.")


# ----------------------------------------------------------------------------
# Entry point
# ----------------------------------------------------------------------------

def main() -> None:
    reset_tables()

    print("Loading tables (parent tables first, to satisfy foreign keys)...")
    load_customers()
    load_sellers()
    load_category_translation()
    load_products()
    load_orders()
    load_order_items()
    load_order_payments()
    load_order_reviews()
    load_geolocation()

    print("Done.")


if __name__ == "__main__":
    main()
