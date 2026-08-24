-- ============================================================================
-- 06_customer_segmentation_rfm_summary.sql
--
-- Question: rolled up one row per RFM segment -- how many customers fall
-- into each, and do "champion" customers really have the best average
-- recency/frequency/monetary numbers (they should, since that's how the
-- segment was defined)?
--
-- Tables used: orders, order_items, customers
--
-- Same CTE chain as 06_customer_segmentation_rfm_detail.sql -- see that
-- file for the full walkthrough of each CTE and the NTILE window function.
-- CTEs only last for the one statement they're attached to, so they're
-- repeated here rather than reused from that file, same reasoning as file 5
-- repeating its order_delay CTE across two queries.
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
    CASE
        WHEN (r_score + f_score + m_score) >= 13 THEN 'champion'
        WHEN (r_score + f_score + m_score) >= 10 THEN 'loyal'
        WHEN (r_score + f_score + m_score) >= 6  THEN 'at_risk'
        ELSE 'hibernating'
    END AS segment,
    COUNT(*)                          AS customer_count,
    ROUND(AVG(recency_days))          AS avg_recency_days,
    ROUND(AVG(frequency), 2)          AS avg_frequency,
    ROUND(AVG(monetary), 2)           AS avg_monetary
FROM rfm_scores
GROUP BY segment
ORDER BY avg_monetary DESC;
