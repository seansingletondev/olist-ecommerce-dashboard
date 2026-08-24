-- ============================================================================
-- 05_review_analysis.sql
--
-- Question: does review score correlate with how late a delivery was, and
-- does that relationship hold consistently across product categories?
--
-- Tables used: order_reviews, orders, order_items, products,
-- product_category_translation
--
-- This file mostly reuses concepts from earlier files (CTE from file 4,
-- EXTRACT/date math from file 2, CASE from file 3) rather than introducing
-- brand new syntax -- the one new trick is using CASE *inside* an aggregate
-- function to compute two separate averages from ONE pass over the data
-- (see Query 2 below), instead of running two queries or using GROUP BY.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Query 1: average review score by delivery-delay bucket
--
-- delay_days is how many days after (positive) or before (negative) the
-- estimated delivery date the order actually arrived -- same EXTRACT/86400
-- trick from file 2, just measured against the ESTIMATE instead of the
-- purchase date this time.
--
-- We order by MIN(od.delay_days) rather than alphabetically by bucket name,
-- because the bucket labels don't sort into the order we actually want
-- ('15_plus_days_late' would sort before '4_to_7_days_late' as plain text).
-- ----------------------------------------------------------------------------
WITH order_delay AS (
    SELECT
        o.order_id,
        EXTRACT(EPOCH FROM (o.order_delivered_customer_date - o.order_estimated_delivery_date))
            / 86400 AS delay_days
    FROM orders o
    WHERE o.order_status = 'delivered'
        AND o.order_delivered_customer_date IS NOT NULL
)
SELECT
    CASE
        WHEN od.delay_days <= 0  THEN 'early_or_on_time'
        WHEN od.delay_days <= 3  THEN '1_to_3_days_late'
        WHEN od.delay_days <= 7  THEN '4_to_7_days_late'
        WHEN od.delay_days <= 14 THEN '8_to_14_days_late'
        ELSE '15_plus_days_late'
    END AS delay_bucket,
    COUNT(*) AS review_count,
    ROUND(AVG(r.review_score)::numeric, 2) AS avg_review_score
FROM order_reviews r
JOIN order_delay od ON od.order_id = r.order_id
GROUP BY delay_bucket
ORDER BY MIN(od.delay_days);


-- ----------------------------------------------------------------------------
-- Query 2: on-time vs. late average review score, per category
--
-- Rather than GROUP BY-ing on delay bucket AND category (which would spread
-- the data thin across many small groups), we compute two CONDITIONAL
-- averages side by side per category: AVG(CASE WHEN <on time> THEN score END)
-- and AVG(CASE WHEN <late> THEN score END). When the CASE doesn't match, it
-- returns NULL, and AVG silently ignores NULLs -- so each of the two columns
-- only averages the rows that actually belong to it, in a single pass over
-- the data instead of two separate queries.
--
-- HAVING requires at least 100 reviews so the comparison per category is
-- based on enough data to mean something, same reasoning as file 3.
-- ----------------------------------------------------------------------------
WITH order_delay AS (
    SELECT
        o.order_id,
        EXTRACT(EPOCH FROM (o.order_delivered_customer_date - o.order_estimated_delivery_date))
            / 86400 AS delay_days
    FROM orders o
    WHERE o.order_status = 'delivered'
        AND o.order_delivered_customer_date IS NOT NULL
)
SELECT
    pct.product_category_name_english AS category,
    COUNT(DISTINCT r.review_pk) AS review_count,
    ROUND(AVG(CASE WHEN od.delay_days <= 0 THEN r.review_score END)::numeric, 2)
        AS avg_score_on_time,
    ROUND(AVG(CASE WHEN od.delay_days > 0 THEN r.review_score END)::numeric, 2)
        AS avg_score_late
FROM order_reviews r
JOIN order_delay od ON od.order_id = r.order_id
JOIN order_items oi ON oi.order_id = od.order_id
JOIN products p ON p.product_id = oi.product_id
JOIN product_category_translation pct
    ON pct.product_category_name = p.product_category_name
GROUP BY pct.product_category_name_english
HAVING COUNT(DISTINCT r.review_pk) >= 100
ORDER BY review_count DESC;
