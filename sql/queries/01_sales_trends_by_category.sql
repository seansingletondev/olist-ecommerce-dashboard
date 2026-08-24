-- ============================================================================
-- 01_sales_trends_by_category.sql
--
-- Question: how does revenue and order volume move month to month, broken
-- down by product category?
--
-- Tables used: orders, order_items, products, product_category_translation
--
-- Concepts: same as 01_sales_trends_overall.sql (JOIN, DATE_TRUNC, GROUP BY,
-- aggregate functions, ROUND) -- see that file for the explanations.
--
-- Same idea as the overall version, but we join further out to products (to
-- get each item's category) and then to product_category_translation (to
-- get the English category name instead of the raw Portuguese one).
-- Grouping by TWO columns (month AND category) gives one row per
-- month-category pair.
-- ============================================================================
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
