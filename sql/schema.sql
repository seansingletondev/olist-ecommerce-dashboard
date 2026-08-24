-- ============================================================================
-- schema.sql
--
-- This file defines the database structure (the "schema") for the Olist
-- e-commerce dataset in PostgreSQL. Running this file creates 9 empty tables
-- with the right columns, data types, and relationships. No data is loaded
-- here -- that happens later in the Python ingestion script.
--
-- If you're new to SQL: every concept used in this file (PRIMARY KEY,
-- FOREIGN KEY, data types, CHECK, etc.) is explained in plain English in
-- sql/SQL_GUIDE.md, in the same order it appears here. Read that alongside
-- this file the first time through.
--
-- Order matters in this file: a table that references another table with a
-- FOREIGN KEY must be created AFTER the table it points to. That's why
-- customers/sellers/products/category-translation come first, and the
-- order-related tables (which point back to them) come after.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. customers
-- One row per customer record. Note: `customer_id` is unique per ORDER
-- (Olist gives a fresh customer_id every time someone orders), while
-- `customer_unique_id` identifies the actual person across multiple orders.
-- This is a quirk of the source data, not a mistake -- keep both columns.
-- ----------------------------------------------------------------------------
CREATE TABLE customers (
    customer_id               TEXT PRIMARY KEY,
    customer_unique_id        TEXT NOT NULL,
    customer_zip_code_prefix  INTEGER NOT NULL,
    customer_city             TEXT NOT NULL,
    customer_state            CHAR(2) NOT NULL
);

-- An index on customer_unique_id makes "find all orders by this real person"
-- queries fast. It's not a primary key because the same person can (and
-- does) appear on multiple rows.
CREATE INDEX idx_customers_unique_id ON customers (customer_unique_id);


-- ----------------------------------------------------------------------------
-- 2. sellers
-- One row per seller. Structurally almost identical to customers.
-- ----------------------------------------------------------------------------
CREATE TABLE sellers (
    seller_id               TEXT PRIMARY KEY,
    seller_zip_code_prefix  INTEGER NOT NULL,
    seller_city             TEXT NOT NULL,
    seller_state            CHAR(2) NOT NULL
);


-- ----------------------------------------------------------------------------
-- 3. product_category_translation
-- A small lookup table: Portuguese category name -> English category name.
-- product_category_name is the PRIMARY KEY here because each Portuguese
-- category name should appear exactly once in this table.
-- ----------------------------------------------------------------------------
CREATE TABLE product_category_translation (
    product_category_name          TEXT PRIMARY KEY,
    product_category_name_english  TEXT NOT NULL
);


-- ----------------------------------------------------------------------------
-- 4. products
-- One row per product. product_category_name is a FOREIGN KEY pointing at
-- product_category_translation, so it MUST already exist as a table above.
--
-- product_category_name is nullable because a small number of products in
-- the raw data have no category recorded -- that's real, not a data-entry
-- error, so we allow NULL rather than inventing a fake value.
--
-- Several numeric columns (weight, dimensions, etc.) are nullable for the
-- same reason: a handful of products are missing this data in the source.
-- ----------------------------------------------------------------------------
CREATE TABLE products (
    product_id                  TEXT PRIMARY KEY,
    product_category_name       TEXT REFERENCES product_category_translation (product_category_name),
    product_name_length         INTEGER,
    product_description_length  INTEGER,
    product_photos_qty          INTEGER,
    product_weight_g            INTEGER,
    product_length_cm           INTEGER,
    product_height_cm           INTEGER,
    product_width_cm            INTEGER
);

-- NOTE ON NAMING: the source CSV misspells these two columns as
-- "product_name_lenght" and "product_description_lenght" (missing the 'g').
-- We spell them correctly in our own schema (length, not lenght) and will
-- rename them during the Python ingestion step, so the database itself
-- stays clean even though the raw file has a typo.


-- ----------------------------------------------------------------------------
-- 5. orders
-- The fact table -- almost everything else in this project joins back to
-- this table through order_id. customer_id is a FOREIGN KEY into customers.
--
-- Several timestamp columns are nullable ON PURPOSE: an order that was
-- cancelled before shipping will never get a order_delivered_carrier_date
-- or order_delivered_customer_date, for example. NULL here means "this
-- event hasn't happened," not missing/bad data.
--
-- The CHECK constraint on order_status restricts the column to the exact
-- set of statuses that exist in this dataset, catching typos on load.
-- ----------------------------------------------------------------------------
CREATE TABLE orders (
    order_id                       TEXT PRIMARY KEY,
    customer_id                    TEXT NOT NULL REFERENCES customers (customer_id),
    order_status                   TEXT NOT NULL CHECK (
        order_status IN (
            'created', 'approved', 'invoiced', 'processing',
            'shipped', 'delivered', 'unavailable', 'canceled'
        )
    ),
    order_purchase_timestamp       TIMESTAMP NOT NULL,
    order_approved_at              TIMESTAMP,
    order_delivered_carrier_date   TIMESTAMP,
    order_delivered_customer_date  TIMESTAMP,
    order_estimated_delivery_date  TIMESTAMP NOT NULL
);

-- We'll frequently ask "how many orders does each customer have?" or filter
-- by status, so index both.
CREATE INDEX idx_orders_customer_id ON orders (customer_id);
CREATE INDEX idx_orders_status ON orders (order_status);


-- ----------------------------------------------------------------------------
-- 6. order_items
-- One row per item WITHIN an order (an order with 3 different products has
-- 3 rows here). Because no single column is unique on its own, the primary
-- key is a COMPOSITE of (order_id, order_item_id) -- the combination of the
-- two is guaranteed unique even though neither column is unique alone.
-- ----------------------------------------------------------------------------
CREATE TABLE order_items (
    order_id             TEXT NOT NULL REFERENCES orders (order_id),
    order_item_id        INTEGER NOT NULL,
    product_id           TEXT NOT NULL REFERENCES products (product_id),
    seller_id            TEXT NOT NULL REFERENCES sellers (seller_id),
    shipping_limit_date  TIMESTAMP NOT NULL,
    price                NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    freight_value        NUMERIC(10, 2) NOT NULL CHECK (freight_value >= 0),
    PRIMARY KEY (order_id, order_item_id)
);

CREATE INDEX idx_order_items_product_id ON order_items (product_id);
CREATE INDEX idx_order_items_seller_id ON order_items (seller_id);


-- ----------------------------------------------------------------------------
-- 7. order_payments
-- One row per payment applied to an order (an order paid with a gift
-- voucher AND a credit card has 2 rows). Same composite-key idea as
-- order_items: (order_id, payment_sequential) together are unique.
-- ----------------------------------------------------------------------------
CREATE TABLE order_payments (
    order_id              TEXT NOT NULL REFERENCES orders (order_id),
    payment_sequential    INTEGER NOT NULL,
    payment_type          TEXT NOT NULL CHECK (
        payment_type IN ('credit_card', 'boleto', 'voucher', 'debit_card', 'not_defined')
    ),
    payment_installments  INTEGER NOT NULL CHECK (payment_installments >= 0),
    payment_value         NUMERIC(10, 2) NOT NULL CHECK (payment_value >= 0),
    PRIMARY KEY (order_id, payment_sequential)
);


-- ----------------------------------------------------------------------------
-- 8. order_reviews
-- One row per review. IMPORTANT QUIRK: in the raw Olist data, review_id is
-- NOT always unique -- a small number of review_ids repeat across different
-- orders. That means we can't safely use review_id itself as our PRIMARY
-- KEY (Postgres would reject the second insert of a repeated id).
--
-- Instead we generate our OWN guaranteed-unique id (review_pk, a
-- BIGSERIAL/"auto-incrementing number") as the primary key, and keep the
-- original review_id as a plain, indexed (but not unique) column. This is
-- called a "surrogate key" -- a made-up key we control, used specifically
-- because the natural/business key (review_id) isn't reliable enough to be
-- one. See SQL_GUIDE.md for more on this.
-- ----------------------------------------------------------------------------
CREATE TABLE order_reviews (
    review_pk               BIGSERIAL PRIMARY KEY,
    review_id                TEXT NOT NULL,
    order_id                 TEXT NOT NULL REFERENCES orders (order_id),
    review_score             SMALLINT NOT NULL CHECK (review_score BETWEEN 1 AND 5),
    review_comment_title     TEXT,
    review_comment_message   TEXT,
    review_creation_date     TIMESTAMP NOT NULL,
    review_answer_timestamp  TIMESTAMP NOT NULL
);

CREATE INDEX idx_order_reviews_order_id ON order_reviews (order_id);
CREATE INDEX idx_order_reviews_review_id ON order_reviews (review_id);


-- ----------------------------------------------------------------------------
-- 9. geolocation
-- Maps a zip code prefix to an approximate latitude/longitude/city/state.
-- This table has NO primary key and NO foreign keys, for two real reasons:
--
--   1. The same zip_code_prefix appears many times (once per individual
--      lat/lng data point Olist collected), so no single column -- or
--      even a combination -- is guaranteed unique.
--   2. customers.customer_zip_code_prefix and sellers.seller_zip_code_prefix
--      can't cleanly FOREIGN KEY into this table's zip codes, because a
--      given zip prefix here isn't unique either (a real FOREIGN KEY must
--      point at a column that IS unique on the other end).
--
-- We'll still surrogate-key it (geolocation_pk) so every row is individually
-- addressable, and index the zip code column since that's how we'll join
-- to it in queries (a normal join, just not one enforced by a constraint).
-- ----------------------------------------------------------------------------
CREATE TABLE geolocation (
    geolocation_pk            BIGSERIAL PRIMARY KEY,
    geolocation_zip_code_prefix  INTEGER NOT NULL,
    geolocation_lat           DOUBLE PRECISION NOT NULL,
    geolocation_lng           DOUBLE PRECISION NOT NULL,
    geolocation_city          TEXT NOT NULL,
    geolocation_state         CHAR(2) NOT NULL
);

CREATE INDEX idx_geolocation_zip ON geolocation (geolocation_zip_code_prefix);
