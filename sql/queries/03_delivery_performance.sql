-- ============================================================================
-- 03_delivery_performance.sql
--
-- Question: how often do deliveries arrive late vs. the estimate Olist gave
-- the customer, and does that vary by state or by seller?
--
-- Tables used: orders, customers, order_items, sellers
-- (order_items/sellers weren't in the original table list for this file --
-- orders has no seller_id of its own, sellers only connect to orders THROUGH
-- order_items, so we need that join for the by-seller breakdown.)
--
-- New SQL concepts introduced in this file:
--   - CASE expression : an if/else you can use inside a SELECT (or WHERE,
--                        or GROUP BY). Evaluates each WHEN top-to-bottom and
--                        returns the first match's result, like a switch
--                        statement. Here we use it to turn a date comparison
--                        into a plain 'late' / 'on_time' label per row.
--   - HAVING           : a WHERE clause that runs AFTER GROUP BY, so it can
--                        filter on an aggregate (like COUNT(*)) that doesn't
--                        exist until the grouping happens. WHERE filters
--                        individual rows before grouping; HAVING filters
--                        whole groups after grouping. Used below to drop
--                        sellers with too few orders to be a meaningful
--                        statistic.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Query 1: overall late-delivery rate
--
-- "Late" means the order arrived AFTER the estimated delivery date Olist
-- promised. As in file 2, we restrict to delivered orders with a real
-- delivery date, since "late or on time" is meaningless for an order that
-- never arrived.
-- ----------------------------------------------------------------------------
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


-- ----------------------------------------------------------------------------
-- Query 2: late-delivery rate by customer state
-- ----------------------------------------------------------------------------
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


-- ----------------------------------------------------------------------------
-- Query 3: worst late-delivery rate by seller
--
-- An order can contain items from more than one seller, so "this order was
-- late" gets attributed to every seller who had an item in it -- that's a
-- simplification (we can't isolate which specific seller's item caused the
-- delay from this data alone), but it's still a fair signal of which sellers
-- are frequently associated with late orders.
--
-- HAVING COUNT(DISTINCT o.order_id) >= 20 drops low-volume sellers, since a
-- seller with 2 orders and 1 late one would otherwise show a scary-looking
-- but statistically meaningless 50% late rate.
-- ----------------------------------------------------------------------------
SELECT
    oi.seller_id,
    COUNT(DISTINCT o.order_id) AS delivered_order_count,
    ROUND(
        100.0 * COUNT(DISTINCT CASE
            WHEN o.order_delivered_customer_date > o.order_estimated_delivery_date
            THEN o.order_id
        END) / COUNT(DISTINCT o.order_id),
        1
    ) AS pct_late
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.order_status = 'delivered'
    AND o.order_delivered_customer_date IS NOT NULL
GROUP BY oi.seller_id
HAVING COUNT(DISTINCT o.order_id) >= 20
ORDER BY pct_late DESC
LIMIT 20;
