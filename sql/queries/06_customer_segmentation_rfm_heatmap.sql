-- ============================================================================
-- 06_customer_segmentation_rfm_heatmap.sql
--
-- Question: how are customers distributed across Recency and Monetary
-- quintiles at once? (e.g. are most customers "recent but low-spend," or
-- "big spenders who haven't bought in a while," or something else?) This
-- feeds a small recency-x-monetary heatmap in the dashboard.
--
-- Tables used: orders, order_items, customers
--
-- Same 5-CTE chain as 06_customer_segmentation_rfm_detail.sql -- see that
-- file for the full walkthrough of each CTE and the NTILE window function.
-- Only the final SELECT differs: instead of one row per customer, this
-- collapses to one row per (r_score, m_score) cell -- 25 rows (5x5) instead
-- of 94,983.
--
-- Frequency is deliberately left OUT as a heatmap axis (this is R x M
-- only, not R x F x M). That's not an oversight -- the detail file's
-- comments already found that the large majority of Olist customers placed
-- exactly one order, so `frequency` barely discriminates between customers
-- in this dataset. A third axis built on a value that's almost always the
-- same number wouldn't add real signal, just a mostly-flat third dimension.
-- ============================================================================
WITH reference_date AS (
    SELECT MAX(order_purchase_timestamp) AS snapshot_date
    FROM orders
),

customer_orders AS (
    SELECT
        c.customer_unique_id,
        o.order_id,
        o.order_purchase_timestamp
    FROM orders o
    JOIN customers c ON c.customer_id = o.customer_id
    WHERE o.order_status NOT IN ('canceled', 'unavailable')
),

order_totals AS (
    SELECT order_id, SUM(price) AS order_total
    FROM order_items
    GROUP BY order_id
),

rfm_base AS (
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
    SELECT
        rb.customer_unique_id,
        NTILE(5) OVER (ORDER BY rb.last_order_date ASC) AS r_score,
        NTILE(5) OVER (ORDER BY rb.frequency ASC, rb.monetary ASC) AS f_score,
        NTILE(5) OVER (ORDER BY rb.monetary ASC)        AS m_score
    FROM rfm_base rb
    CROSS JOIN reference_date rd
)
SELECT
    r_score,
    m_score,
    COUNT(*) AS customer_count
FROM rfm_scores
GROUP BY r_score, m_score
ORDER BY r_score, m_score;
