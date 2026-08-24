-- ============================================================================
-- 01_sales_trends_overall.sql
--
-- Question: how does revenue and order volume move month to month overall?
--
-- Tables used: orders, order_items
--
-- New SQL concepts introduced in this file (first time we've needed them --
-- SQL_GUIDE.md only covers schema-building, not querying, so they're
-- explained here instead):
--   - JOIN            : combining rows from two tables based on a matching
--                        column, e.g. "attach each order_item to its parent
--                        order by matching on order_id."
--   - DATE_TRUNC       : rounds a timestamp DOWN to a given precision. For
--                        example DATE_TRUNC('month', '2018-06-15') returns
--                        '2018-06-01 00:00:00'. That collapses every day in
--                        June onto one shared value, which is exactly what
--                        we need to group "all orders in June" together.
--   - GROUP BY         : collapses many rows into one row per distinct value
--                        of whatever you group by (here, one row per month).
--                        Any column in the SELECT list that ISN'T being
--                        aggregated (summed/counted/etc.) must appear in the
--                        GROUP BY, or Postgres won't know which of the many
--                        underlying rows' value to show.
--   - Aggregate functions (SUM, COUNT, COUNT DISTINCT): calculate one
--                        value FROM a group of rows. SUM adds a column up,
--                        COUNT counts rows, COUNT DISTINCT counts unique
--                        values (so an order with 3 line items still counts
--                        as 1 order, not 3).
--   - ROUND            : rounds a numeric value to N decimal places, mainly
--                        for tidier output.
--
-- Revenue lives on order_items (price per line item), not on orders itself,
-- so we JOIN orders to order_items on order_id to bring the two together.
-- We only count orders that were actually fulfilled -- 'canceled' and
-- 'unavailable' orders never really generated revenue, so we exclude them
-- with WHERE before grouping.
-- ============================================================================
SELECT
    DATE_TRUNC('month', o.order_purchase_timestamp) AS month,
    COUNT(DISTINCT o.order_id)                      AS order_count,
    ROUND(SUM(oi.price)::numeric, 2)                AS total_revenue
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.order_status NOT IN ('canceled', 'unavailable')
GROUP BY DATE_TRUNC('month', o.order_purchase_timestamp)
ORDER BY month;
