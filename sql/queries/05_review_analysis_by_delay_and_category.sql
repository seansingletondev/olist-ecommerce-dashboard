-- ============================================================================
-- 05_review_analysis_by_delay_and_category.sql
--
-- Question: does the on-time-vs-late review score gap hold consistently
-- across product categories?
--
-- Tables used: order_reviews, orders, order_items, products,
-- product_category_translation
--
-- New trick in this file: using CASE *inside* an aggregate function to
-- compute two separate averages from ONE pass over the data, instead of
-- running two queries or using GROUP BY on a second column. Rather than
-- GROUP BY-ing on delay bucket AND category (which would spread the data
-- thin across many small groups), we compute two CONDITIONAL averages side
-- by side per category: AVG(CASE WHEN <on time> THEN score END) and
-- AVG(CASE WHEN <late> THEN score END). When the CASE doesn't match, it
-- returns NULL, and AVG silently ignores NULLs -- so each of the two
-- columns only averages the rows that actually belong to it.
--
-- HAVING requires at least 100 reviews so the comparison per category is
-- based on enough data to mean something, same reasoning as file 3.
-- ============================================================================
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
