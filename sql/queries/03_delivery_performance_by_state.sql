-- ============================================================================
-- 03_delivery_performance_by_state.sql
--
-- Question: how does the late-delivery rate vary by customer state?
--
-- Tables used: orders, customers
--
-- Concepts: same CASE expression as 03_delivery_performance_overall.sql,
-- combined with a plain JOIN + GROUP BY (both introduced in file 1/2).
-- ============================================================================
SELECT
    c.customer_state AS state,
    COUNT(*) AS delivered_order_count,
    ROUND(
        100.0 * SUM(
            CASE WHEN o.order_delivered_customer_date > o.order_estimated_delivery_date
                 THEN 1 ELSE 0 END
        ) / COUNT(*),
        1
    ) AS pct_late
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
WHERE o.order_status = 'delivered'
    AND o.order_delivered_customer_date IS NOT NULL
GROUP BY c.customer_state
ORDER BY pct_late DESC;
