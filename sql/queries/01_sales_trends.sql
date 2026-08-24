-- ============================================================================
-- 01_sales_trends.sql
--
-- Question: how does revenue and order volume move month to month, both
-- overall and broken down by product category?
--
-- Tables used: orders, order_items, products, product_category_translation
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
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Query 1: overall monthly revenue and order volume
--
-- Revenue lives on order_items (price per line item), not on orders itself,
-- so we JOIN orders to order_items on order_id to bring the two together.
-- We only count orders that were actually fulfilled -- 'canceled' and
-- 'unavailable' orders never really generated revenue, so we exclude them
-- with WHERE before grouping.
-- ----------------------------------------------------------------------------
SELECT
    DATE_TRUNC('month', o.order_purchase_timestamp) AS month,
    COUNT(DISTINCT o.order_id)                      AS order_count,
    ROUND(SUM(oi.price)::numeric, 2)                AS total_revenue
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.order_status NOT IN ('canceled', 'unavailable')
GROUP BY DATE_TRUNC('month', o.order_purchase_timestamp)
ORDER BY month;


-- ----------------------------------------------------------------------------
-- Query 2: monthly revenue and order volume, by product category
--
-- Same idea as Query 1, but we join further out to products (to get each
-- item's category) and then to product_category_translation (to get the
-- English category name instead of the raw Portuguese one). Grouping by
-- TWO columns (month AND category) gives one row per month-category pair.
-- ----------------------------------------------------------------------------
SELECT
    DATE_TRUNC('month', o.order_purchase_timestamp) AS month,
    pct.product_category_name_english               AS category,
    COUNT(DISTINCT o.order_id)                       AS order_count,
    ROUND(SUM(oi.price)::numeric, 2)                 AS total_revenue
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
JOIN products p ON p.product_id = oi.product_id
JOIN product_category_translation pct
    ON pct.product_category_name = p.product_category_name
WHERE o.order_status NOT IN ('canceled', 'unavailable')
GROUP BY
    DATE_TRUNC('month', o.order_purchase_timestamp),
    pct.product_category_name_english
ORDER BY month, total_revenue DESC;
