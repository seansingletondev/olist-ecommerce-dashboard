-- ============================================================================
-- 03_delivery_performance_overall.sql
--
-- Question: how often do deliveries arrive late vs. the estimate Olist gave
-- the customer, overall?
--
-- Tables used: orders
--
-- New SQL concept introduced in this file:
--   - CASE expression : an if/else you can use inside a SELECT (or WHERE,
--                        or GROUP BY). Evaluates each WHEN top-to-bottom and
--                        returns the first match's result, like a switch
--                        statement. Here we use it to turn a date comparison
--                        into a plain 1/0 flag per row that SUM can add up.
--
-- "Late" means the order arrived AFTER the estimated delivery date Olist
-- promised. As in file 2, we restrict to delivered orders with a real
-- delivery date, since "late or on time" is meaningless for an order that
-- never arrived.
-- ============================================================================
SELECT
    COUNT(*) AS delivered_order_count,
    SUM(
        CASE WHEN o.order_delivered_customer_date > o.order_estimated_delivery_date
             THEN 1 ELSE 0 END
    ) AS late_count,
    ROUND(
        100.0 * SUM(
            CASE WHEN o.order_delivered_customer_date > o.order_estimated_delivery_date
                 THEN 1 ELSE 0 END
        ) / COUNT(*),
        1
    ) AS pct_late
FROM orders o
WHERE o.order_status = 'delivered'
    AND o.order_delivered_customer_date IS NOT NULL;
