# SQL Guide: reading `schema.sql`

This is a plain-English walkthrough of every SQL concept used in `sql/schema.sql`,
in the same order those concepts first show up in that file. Read the two side by
side: skim a section of `schema.sql`, then read the matching section here.

Nothing here loads any data — `schema.sql` only defines empty tables (this is
called **DDL**, "Data Definition Language"). Data gets loaded later by the Python
ingestion script (that will be **DML**, "Data Manipulation Language" — `INSERT`
statements).

---

## 1. `CREATE TABLE` and columns

```sql
CREATE TABLE customers (
    customer_id  TEXT PRIMARY KEY,
    ...
);
```

`CREATE TABLE <name> ( <column definitions>, ... );` creates a table with a fixed
set of named, typed columns. Every row inserted later must fit this shape — that's
the whole point of a schema: it's a contract about what the data is allowed to
look like, enforced by the database itself rather than by hoping every script that
writes to it behaves.

Each column definition is `column_name TYPE [constraints]`. Constraints are rules
the database enforces automatically on every insert/update — see below.

## 2. Data types

The types used in `schema.sql`, and why each one was picked:

| Type | Used for | Why |
|---|---|---|
| `TEXT` | ids, names, cities | Postgres doesn't need a max length like `VARCHAR(n)` — `TEXT` is the simple default for strings here. |
| `CHAR(2)` | `customer_state`, `seller_state` | Brazilian state codes are always exactly 2 letters (`SP`, `RJ`, ...) — `CHAR(2)` documents that fixed width directly in the schema. |
| `INTEGER` | zip code prefixes, counts | Whole numbers with no decimal part. |
| `SMALLINT` | `review_score` | A small integer range (1–5) doesn't need `INTEGER`'s full range — `SMALLINT` is a minor "this is a small bounded number" signal. |
| `NUMERIC(10, 2)` | prices, freight, payment values | **Never use floating point (`FLOAT`/`REAL`) for money.** Floats round in ways that quietly corrupt totals. `NUMERIC(10, 2)` is exact: up to 10 total digits, always 2 after the decimal point. |
| `TIMESTAMP` | order/review dates | Date + time together, no timezone (the source data doesn't carry one). |
| `DOUBLE PRECISION` | lat/lng | Geographic coordinates need real decimal precision, not fixed-point — this is the one place floating point is the right tool. |
| `BIGSERIAL` | `review_pk`, `geolocation_pk` | An auto-incrementing 64-bit integer (1, 2, 3, ...) that Postgres generates for you. Used only for surrogate keys — see §7. |

## 3. `PRIMARY KEY`

```sql
customer_id  TEXT PRIMARY KEY
```

A **primary key** is the column (or combination of columns) that uniquely
identifies each row. Postgres enforces two things automatically: no two rows can
ever have the same value in that column, and it can never be `NULL`. Every table
in this schema has one — it's how every other table refers back to a specific row
in this one (see Foreign Keys, next).

## 4. `NOT NULL` and nullable columns

```sql
customer_city  TEXT NOT NULL
```

By default, any column can hold `NULL` ("no value recorded"). Adding `NOT NULL`
tells Postgres to reject any row missing that value. In this schema, columns are
marked `NOT NULL` unless there's a *real-world reason* the value can legitimately
be absent. Two examples worth knowing before you hit them further down:

- `products.product_category_name` has no `NOT NULL` — a small number of real
  products in the source data have no category, and that's genuine, not a data
  bug. Forcing `NOT NULL` here would mean inventing a fake category just to
  satisfy the database, which would be worse than leaving it `NULL`.
- `orders.order_delivered_carrier_date` has no `NOT NULL` — an order that was
  cancelled before shipping will never get this timestamp. `NULL` means "this
  event hasn't happened yet (or ever)," which is meaningful information, not
  missing data.

The rule of thumb used throughout: nullable columns should always be a
deliberate decision about what's real in the data, not an oversight.

## 5. `CREATE INDEX`

```sql
CREATE INDEX idx_customers_unique_id ON customers (customer_unique_id);
```

An index is a separate lookup structure Postgres maintains alongside a table,
so that searching or joining on that column doesn't require scanning every
row. Primary keys get an index automatically for free; `CREATE INDEX` adds
one manually on other columns you know you'll filter or join on a lot.

Rule of thumb applied here: index a column if queries will frequently search
or join on it, but *not* every column — each index costs disk space and
slows down inserts slightly, so they're added deliberately (e.g.
`idx_orders_customer_id` because "all orders for this customer" is a
constant query pattern; `idx_orders_status` because filtering by status is
too).

## 6. `customers` and `sellers` — the simple tables

These two are the simplest tables in the schema: a primary key plus a handful of
`NOT NULL` descriptive columns. Nothing new here beyond §1–5, but worth noting the
data quirk in `customers`: `customer_id` is unique **per order** (Olist mints a
fresh one every time someone orders), while `customer_unique_id` identifies the
actual person across multiple orders. That's why `customer_unique_id` gets an
index but isn't the primary key — it's not unique per row, just useful to search on.

## 7. `FOREIGN KEY` — linking tables together

```sql
CREATE TABLE products (
    product_id              TEXT PRIMARY KEY,
    product_category_name   TEXT REFERENCES product_category_translation (product_category_name),
    ...
);
```

`REFERENCES <other_table> (<column>)` declares a **foreign key**: this column's
value must either be `NULL`, or match some existing value in the referenced
table's column. This is how relational databases represent "this row relates to
that row" — `products.product_category_name` points at
`product_category_translation.product_category_name`.

Postgres enforces this automatically: you cannot insert a product with a category
name that doesn't already exist in `product_category_translation`. This is why
**table creation order matters** — a table can only reference a table that
already exists. That's exactly why `product_category_translation`, `customers`,
`sellers`, and `products` are created before `orders`, `order_items`, etc.: the
order-related tables reference them.

`product_category_translation` itself is a small **lookup table** (Portuguese
name → English name) — its primary key is the category name itself rather than
a made-up id, since each Portuguese name should appear exactly once.

## 8. `orders` — the fact table, and `CHECK`

```sql
order_status  TEXT NOT NULL CHECK (
    order_status IN ('created', 'approved', 'invoiced', 'processing',
                      'shipped', 'delivered', 'unavailable', 'canceled')
)
```

`orders` is called the **fact table** because almost every analysis in this
project joins back to it — it's the center of the star. It also introduces
`CHECK`: a constraint that validates a column against an arbitrary boolean
expression, here restricting `order_status` to exactly the 8 values that exist
in the real dataset. Any insert attempt with a typo'd or unexpected status
(e.g. `'delivererd'`) gets rejected at the database level instead of silently
polluting later analysis.

## 9. Composite primary keys

```sql
CREATE TABLE order_items (
    order_id       TEXT NOT NULL REFERENCES orders (order_id),
    order_item_id  INTEGER NOT NULL,
    ...
    PRIMARY KEY (order_id, order_item_id)
);
```

`order_items` has one row per item *within* an order — an order with 3 different
products has 3 rows. No single column is unique on its own (`order_id` repeats
across items in the same order; `order_item_id` repeats across different orders'
first items). But the **combination** of the two is always unique, so
`PRIMARY KEY (order_id, order_item_id)` declares a **composite key** — Postgres
enforces uniqueness across both columns together instead of one.

`order_payments` uses the identical pattern with `(order_id, payment_sequential)`,
because an order paid partly with a gift voucher and partly with a credit card
gets 2 payment rows.

## 10. Surrogate keys

```sql
CREATE TABLE order_reviews (
    review_pk  BIGSERIAL PRIMARY KEY,
    review_id  TEXT NOT NULL,
    ...
);
```

You'd expect `review_id` to be the primary key here — but in the real Olist
data, a small number of `review_id` values repeat across *different* orders.
That means `review_id` can't safely be a primary key (Postgres would reject the
second insert of a repeated value).

The fix: `review_pk` is a **surrogate key** — an id we invent ourselves,
meaningless in the real world, that exists purely to give every row a
guaranteed-unique identifier. `BIGSERIAL` makes Postgres auto-generate it
(1, 2, 3, ...) on every insert. The original `review_id` is kept as a normal,
indexed (but not unique) column, so you can still look reviews up by it — it's
just not trusted to be one-of-a-kind anymore.

Contrast this with `customers`/`sellers`/`orders`, where the natural id from
the source data *is* reliable enough to be the primary key directly — that's
called a **natural key** (or "business key"). Surrogate keys are the fallback
for when the natural key turns out not to be trustworthy.

## 11. `geolocation` — a table with no keys at all

```sql
CREATE TABLE geolocation (
    geolocation_pk               BIGSERIAL PRIMARY KEY,
    geolocation_zip_code_prefix  INTEGER NOT NULL,
    ...
);
```

This table has a surrogate primary key (so every row is individually
addressable) but deliberately **no foreign keys** pointing at it, even though
`customers.customer_zip_code_prefix` and `sellers.seller_zip_code_prefix`
conceptually relate to `geolocation_zip_code_prefix`. Two reasons:

1. `geolocation_zip_code_prefix` isn't unique in this table — Olist recorded
   many individual lat/lng points per zip prefix, so the same prefix appears
   on many rows.
2. A `FOREIGN KEY` can only point at a column that *is* unique on the far end
   (usually a primary key). Since the zip prefix here isn't unique, nothing
   can formally reference it as a foreign key.

You can still `JOIN` on `geolocation_zip_code_prefix` in queries later — it's
just an ordinary join, not one the database enforces or guarantees referential
integrity for. That's why it still gets a plain `CREATE INDEX`, same reasoning
as §5, since joins on it will be common.

## 12. Running this file

`schema.sql` just needs to be executed once against an empty Neon Postgres
database — e.g. `psql "<your Neon connection string>" -f sql/schema.sql`, or
pasted into the Neon SQL console. It creates all 9 tables with no data in them.
The Python ingestion script (next up) is what actually loads the CSVs in,
respecting the table creation order and foreign key rules described above.
