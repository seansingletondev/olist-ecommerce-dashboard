-- ============================================================================
-- 06_customer_segmentation_rfm_detail.sql
--
-- Question: score every real customer on Recency (how recently they bought),
-- Frequency (how often), and Monetary value (how much they've spent), then
-- bucket them into quintiles on each -- classic RFM marketing segmentation.
-- This is the most involved query in Phase 2.
--
-- Tables used: orders, order_items, customers
--
-- IMPORTANT quirk this file has to account for: customers.customer_id is
-- unique per ORDER (a new one is minted every time someone buys), while
-- customers.customer_unique_id identifies the actual person across orders
-- (see the comment at the top of the customers table in schema.sql). RFM is
-- about a PERSON's buying behavior over time, so everything here groups by
-- customer_unique_id, not customer_id.
--
-- New SQL concept introduced in this file:
--   - Window function (NTILE) : unlike GROUP BY, which collapses many rows
--     into one row per group, a window function runs a calculation ACROSS a
--     set of rows while still returning one output row per INPUT row -- the
--     `OVER (...)` clause defines that set. NTILE(5) OVER (ORDER BY x)
--     sorts all rows by x and splits them into 5 roughly equal-sized
--     buckets, numbering each row's bucket 1 through 5 in the order x was
--     sorted. So the customer with the smallest x lands in bucket 1, the
--     customer with the largest x lands in bucket 5 -- which bucket counts
--     as "best" depends entirely on which direction you sort in, handled
--     per-column below.
--
-- rfm_total (3-15) is just the three quintile scores added together; segment
-- turns that number into a human-readable label. This is a simplified
-- version of real-world RFM segmentation (which often looks at the specific
-- R/F/M combination, e.g. "recent but low-spend" vs. "big spender who
-- hasn't bought in months," rather than just summing the three) -- good
-- enough for a portfolio dashboard, worth knowing it's a simplification.
--
-- Unlike the by_seller query in file 3, there's no LIMIT here on purpose --
-- this feeds the JSON export, and the dashboard needs every customer, not a
-- top-N sample.
-- ============================================================================
WITH reference_date AS (
    -- This is historical data with no real "today," so we treat the single
    -- most recent purchase in the whole dataset as our snapshot date --
    -- "recency" is measured relative to that, not to today's actual date.
    SELECT MAX(order_purchase_timestamp) AS snapshot_date
    FROM orders
),

customer_orders AS (
    -- One row per (person, order), same NOT IN status filter used for
    -- revenue in earlier files -- a canceled order isn't real purchasing
    -- behavior.
    SELECT
        c.customer_unique_id,
        o.order_id,
        o.order_purchase_timestamp
    FROM orders o
    JOIN customers c ON c.customer_id = o.customer_id
    WHERE o.order_status NOT IN ('canceled', 'unavailable')
),

order_totals AS (
    -- Revenue lives on order_items, one row per line item, so this
    -- collapses each order down to a single spend total before it's
    -- attached to a person.
    SELECT order_id, SUM(price) AS order_total
    FROM order_items
    GROUP BY order_id
),

rfm_base AS (
    -- One row per real person: their most recent purchase date (feeds
    -- Recency), how many distinct orders they placed (Frequency), and
    -- total spend (Monetary) -- the raw ingredients, not yet scored.
    SELECT
        co.customer_unique_id,
        MAX(co.order_purchase_timestamp) AS last_order_date,
        COUNT(DISTINCT co.order_id)      AS frequency,
        SUM(ot.order_total)              AS monetary
    FROM customer_orders co
    JOIN order_totals ot ON ot.order_id = co.order_id
    GROUP BY co.customer_unique_id
),

rfm_scores AS (
    -- CROSS JOIN reference_date attaches the one snapshot_date row to every
    -- customer row -- normally a CROSS JOIN (no ON condition, full
    -- cartesian product) is a red flag, but it's safe here specifically
    -- because reference_date has exactly one row, so it can't multiply
    -- rfm_base's rows.
    --
    -- Scoring direction, one column at a time:
    --   - r_score: sorted by last_order_date ASCENDING, so the customer who
    --     bought longest ago (worst recency) lands in bucket 1, and the
    --     most recent buyer (best recency) lands in bucket 5.
    --   - f_score / m_score: sorted ASCENDING on frequency / monetary
    --     directly, so the lowest spender/least-frequent buyer is bucket 1
    --     and the highest is bucket 5. Higher is better for both, so this
    --     is the natural direction (no need to flip it like recency).
    -- In all three, 5 = best, 1 = worst -- the standard RFM convention.
    --
    -- Tiebreaker note on f_score specifically: the large majority of Olist
    -- customers placed exactly one order, so `frequency` has a massive
    -- block of tied values at 1. NTILE has no way to split a tied block
    -- "correctly" -- with no secondary sort key, Postgres would place those
    -- tied rows into buckets 1 through 5 in whatever order it happens to
    -- encounter them, which is arbitrary and not reproducible from run to
    -- run. Adding `, rb.monetary ASC` as a second ORDER BY key doesn't fix
    -- the underlying fact that frequency barely distinguishes one-time
    -- buyers from each other (that's a real property of this dataset, not
    -- a bug) -- it just makes WHICH bucket a given tied customer lands in
    -- deterministic and explainable (lowest-spending one-time buyers sort
    -- toward bucket 1, highest-spending toward bucket 5) instead of
    -- effectively random.
    SELECT
        rb.customer_unique_id,
        ROUND(EXTRACT(EPOCH FROM (rd.snapshot_date - rb.last_order_date)) / 86400)
            AS recency_days,
        rb.frequency,
        ROUND(rb.monetary, 2) AS monetary,
        NTILE(5) OVER (ORDER BY rb.last_order_date ASC) AS r_score,
        NTILE(5) OVER (ORDER BY rb.frequency ASC, rb.monetary ASC) AS f_score,
        NTILE(5) OVER (ORDER BY rb.monetary ASC)        AS m_score
    FROM rfm_base rb
    CROSS JOIN reference_date rd
)
SELECT
    customer_unique_id,
    recency_days,
    frequency,
    monetary,
    r_score,
    f_score,
    m_score,
    (r_score + f_score + m_score) AS rfm_total,
    CASE
        WHEN (r_score + f_score + m_score) >= 13 THEN 'champion'
        WHEN (r_score + f_score + m_score) >= 10 THEN 'loyal'
        WHEN (r_score + f_score + m_score) >= 6  THEN 'at_risk'
        ELSE 'hibernating'
    END AS segment
FROM rfm_scores
ORDER BY rfm_total DESC;
