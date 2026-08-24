-- ============================================================================
-- 05_review_analysis_by_delay.sql
--
-- Question: does review score correlate with how late a delivery was?
--
-- Tables used: order_reviews, orders
--
-- This file mostly reuses concepts from earlier files (CTE from file 4,
-- EXTRACT/date math from file 2, CASE from file 3) rather than introducing
-- brand new syntax.
--
-- delay_days is how many days after (positive) or before (negative) the
-- estimated delivery date the order actually arrived -- same EXTRACT/86400
-- trick from file 2, just measured against the ESTIMATE instead of the
-- purchase date this time.
--
-- We order by MIN(od.delay_days) rather than alphabetically by bucket name,
-- because the bucket labels don't sort into the order we actually want
-- ('15_plus_days_late' would sort before '4_to_7_days_late' as plain text).
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
