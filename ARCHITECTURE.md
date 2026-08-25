# Architecture: Brazilian E-Commerce Analytics Dashboard

## Goal

A portfolio dashboard built on the Olist Brazilian E-commerce dataset, designed to
demonstrate practical Python, SQL, and TypeScript/D3 skills for data analyst job
applications. The project should read as a small, coherent analytics pipeline —
raw data in, cleaned relational data in the middle, an interactive dashboard out —
rather than a single notebook.

## Dataset

Source: [Kaggle - Brazilian E-Commerce Public Dataset by Olist](https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce)

9 CSVs currently in `datasets/`, all joined around `orders`:

| File | Role |
|---|---|
| `olist_orders_dataset.csv` | Fact table: order status, purchase/delivery timestamps |
| `olist_order_items_dataset.csv` | Line items per order: product, seller, price, freight |
| `olist_order_payments_dataset.csv` | Payment type, installments, value |
| `olist_order_reviews_dataset.csv` | Review score + text per order |
| `olist_customers_dataset.csv` | Customer id + location (city/state) |
| `olist_sellers_dataset.csv` | Seller id + location |
| `olist_products_dataset.csv` | Product category, dimensions, weight |
| `olist_geolocation_dataset.csv` | Zip code prefix -> lat/lng |
| `product_category_name_translation.csv` | PT -> EN category names |

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Ingestion / cleaning | Python (pandas) | Load CSVs, handle nulls/dupes/type coercion, feature engineering (delivery delay, RFM scores) |
| Database | PostgreSQL, hosted free on [Neon](https://neon.tech) | Industry-standard RDBMS (unlike SQLite, it's actually named in DA/DS job postings); serverless free tier means no server to babysit |
| Analysis | SQL (CTEs, window functions, joins) run against Postgres | This is where the "SQL skill" of the project lives — real aggregate queries, not just ORM calls |
| Data hand-off | Python exports query results as static JSON files | Decouples the dashboard from the live DB — see Data Flow below |
| Dashboard | React + TypeScript + D3.js, static site (Vite) | D3 shows custom SVG/scale/transition work, not just a chart-library wrapper — used for every chart, not just 1-2 hero visuals; React handles component structure/state so that plumbing doesn't compete with the D3 work |
| Hosting | [Vercel](https://vercel.com) (static) | Free, deploys straight from the repo, no server to maintain |

## Data Flow

```
Kaggle CSVs (datasets/)
        │
        ▼
Python ingestion scripts (python/ingest/)
  - load & clean CSVs with pandas
  - load into Postgres (Neon) via SQL schema
        │
        ▼
PostgreSQL on Neon
  - normalized schema mirroring the source tables
        │
        ▼
SQL analysis queries (sql/queries/)
  - sales trends, delivery performance, RFM segments,
    review score breakdowns, category & geo performance
        │
        ▼
Python export step (python/export/)
  - runs the SQL queries
  - writes results to dashboard/public/data/*.json
        │
        ▼
React + TypeScript + D3 dashboard (dashboard/)
  - static site, reads the prebuilt JSON
  - builds with Vite, deploys to Vercel
```

Postgres is the analytical engine used during development/build (and where all the
SQL work is demonstrated); it is not queried live by the deployed site. This keeps
the public demo fast and free to host while the repo's SQL layer stays real and
inspectable.

## Database Schema

Mirrors the source CSVs as normalized tables, keyed the same way the dataset already
keys them:

- `customers (customer_id PK, customer_unique_id, customer_zip_code_prefix, customer_city, customer_state)`
- `orders (order_id PK, customer_id FK, order_status, order_purchase_timestamp, order_approved_at, order_delivered_carrier_date, order_delivered_customer_date, order_estimated_delivery_date)`
- `order_items (order_id FK, order_item_id, product_id FK, seller_id FK, price, freight_value)`
- `order_payments (order_id FK, payment_sequential, payment_type, payment_installments, payment_value)`
- `order_reviews (review_id PK, order_id FK, review_score, review_comment_title, review_comment_message, review_creation_date, review_answer_timestamp)`
- `products (product_id PK, product_category_name FK, weight_g, length_cm, height_cm, width_cm)`
- `sellers (seller_id PK, seller_zip_code_prefix, seller_city, seller_state)`
- `geolocation (zip_code_prefix, lat, lng, city, state)`
- `product_category_translation (category_name PT PK, category_name EN)`

## Key Analyses (SQL + Python)

- **Sales trends**: monthly revenue/order volume, by category and overall
- **Delivery performance**: actual vs. estimated delivery date, late-delivery rate by state/seller
- **Customer segmentation**: RFM (recency/frequency/monetary) scoring
- **Review analysis**: average score by category/delivery delay bucket
- **Geographic breakdown**: order volume and average delivery time by state (feeds a D3 choropleth of Brazil)
- **Category performance**: revenue and review score by product category

## Repository Structure (proposed)

```
datasets/                 raw Kaggle CSVs (already populated)
python/
  ingest/                 CSV -> Postgres load scripts
  export/                 SQL query runners -> JSON export
  requirements.txt
sql/
  schema.sql               table definitions
  queries/                 one .sql file per analysis
dashboard/
  src/                     TypeScript + D3 source
  public/data/             generated JSON (build artifact, git-ignored or committed as a snapshot)
  package.json
ARCHITECTURE.md            this file
```

## Phased Roadmap

1. **Schema + load**: write `sql/schema.sql`, Python ingestion script to load all 9 CSVs into Neon Postgres.
2. **SQL analysis**: write and validate the analysis queries in `sql/queries/`.
3. **Export step**: Python script runs each query, writes JSON into `dashboard/public/data/`.
4. **Dashboard**: React + TypeScript + Vite project, D3 for every chart (not just hero visuals) — Brazil choropleth, sales trends, delivery performance, reviews, category performance, RFM segmentation.
5. **Deploy**: public repo, static build deployed to Vercel; README ties the story together (Python → SQL → TS/D3).
