# Olist E-Commerce Analytics Dashboard

An interactive analytics dashboard for the [Olist Brazilian e-commerce marketplace](https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce) (~99k orders, 2016–2018) — sales trends, delivery performance, product category performance, review sentiment, and RFM customer segmentation, built end to end as a real Python → SQL → TypeScript/D3 pipeline rather than a single notebook.

**Live demo:** _(added after deploy)_

## The pipeline

```
Kaggle CSVs (datasets/)
        │
        ▼
Python ingestion (python/ingest/)
  pandas cleaning, type coercion, load into Postgres
        │
        ▼
PostgreSQL on Neon
  normalized schema mirroring the source tables
        │
        ▼
SQL analysis queries (sql/queries/)
  CTEs, window functions, joins — sales trends, delivery
  performance, RFM segmentation, review analysis, geography,
  category performance (12 queries, one per file)
        │
        ▼
Python export (python/export/)
  runs every query, writes results as static JSON
        │
        ▼
React + TypeScript + D3 dashboard (dashboard/)
  reads the prebuilt JSON — no live database in production
```

Postgres is the analytical engine used during development (and where all the SQL
work actually happens); the deployed site never queries it live. That keeps the
public demo fast and free to host while the SQL layer stays real and inspectable
in this repo.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Ingestion / cleaning | Python (pandas) | Load CSVs, handle nulls/dupes/type coercion, feature engineering |
| Database | PostgreSQL on [Neon](https://neon.tech) (free tier) | The RDBMS that actually shows up in DA/DS job postings, not just a convenient local file |
| Analysis | SQL — CTEs, window functions, joins | Real aggregate queries against a real database, not ORM calls |
| Data hand-off | Python exports query results as static JSON | Decouples the deployed dashboard from the live database |
| Dashboard | React + TypeScript + D3.js (Vite) | D3 is used for genuine custom SVG/scale/projection work — every chart, not just 1–2 "hero" pieces |
| Hosting | [Vercel](https://vercel.com) (static build) | Free, deploys straight from this repo, no server to maintain |

## Key analyses

- **Sales trends** — monthly revenue/order volume, overall and by category
- **Geographic breakdown** — order volume, delivery time, and revenue by state (feeds a D3 choropleth of Brazil)
- **Delivery performance** — actual vs. estimated delivery date, late-delivery rate by state and seller
- **Review analysis** — average score by delivery-delay bucket and by category
- **Category performance** — revenue vs. review score by product category
- **Customer segmentation (RFM)** — Recency/Frequency/Monetary scoring via `NTILE` window functions, segmented into Champion/Loyal/At risk/Hibernating

Every chart on the dashboard has a plain-language "Insight" note explaining what it
actually shows — written for a non-technical reader, not just someone who already
knows the domain vocabulary.

## Repository structure

```
datasets/                 raw Kaggle CSVs (gitignored — see datasets/README.md)
python/
  ingest/                 CSV -> Postgres load script
  export/                 runs every SQL query, writes JSON
sql/
  schema.sql               table definitions
  SQL_GUIDE.md              plain-English walkthrough of every schema concept
  queries/                  one .sql file per analysis (12 files)
dashboard/
  src/
    components/
      charts/               one component per visualization, grouped by section
      layout/                shared primitives (ChartCard, Tooltip, Legend, InsightNote, ...)
    lib/                    data fetching, formatting, color scales, palette
    types/                  TypeScript interfaces mirroring the JSON shapes
  public/data/              generated JSON (committed as a build artifact)
  public/geo/                Brazil state boundary TopoJSON
ARCHITECTURE.md            fuller design write-up and phased roadmap
```

## Running it locally

**1. Get the data**
Download the 9 CSVs from the [Kaggle dataset](https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce) into `datasets/` (see `datasets/README.md`).

**2. Load into Postgres**
```
cd python/ingest
cp .env.example .env   # fill in your own Neon (or any Postgres) connection string
python -m venv ../../.venv && ../../.venv/Scripts/activate  # or source ../../.venv/bin/activate
pip install -r requirements.txt
# run sql/schema.sql against your database, then:
python load_to_postgres.py
```

**3. Export the analysis to JSON**
```
cd python/export
python export_to_json.py
```
This runs every query in `sql/queries/` and writes results into `dashboard/public/data/`.

**4. Run the dashboard**
```
cd dashboard
npm install
npm run dev
```

## Data attribution

Dataset: [Brazilian E-Commerce Public Dataset by Olist](https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce), via Kaggle. Brazil state boundary data: [giuliano-macedo/geodata-br-states](https://github.com/giuliano-macedo/geodata-br-states) (MIT), derived from LAGEAMB-UFPR/IBGE.
