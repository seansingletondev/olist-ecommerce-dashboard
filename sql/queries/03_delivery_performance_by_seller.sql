-- ============================================================================
-- 03_delivery_performance_by_seller.sql
--
-- Question: which sellers have the worst late-delivery rate?
--
-- Tables used: orders, order_items
-- (order_items wasn't in the original table list for this analysis --
-- orders has no seller_id of its own, sellers only connect to orders
-- THROUGH order_items, so we need that join to get to seller_id at all.)
--
-- New SQL concept introduced in this file:
--   - HAVING           : a WHERE clause that runs AFTER GROUP BY, so it can
--                        filter on an aggregate (like COUNT(*)) that doesn't
--                        exist until the grouping happens. WHERE filters
--                        individual rows before grouping; HAVING filters
--                        whole groups after grouping. Used below to drop
--                        sellers with too few orders to be a meaningful
--                        statistic.
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
-- ============================================================================
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
