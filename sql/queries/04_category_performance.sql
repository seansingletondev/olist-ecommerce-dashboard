-- ============================================================================
-- 04_category_performance.sql
--
-- Question: which product categories perform best when you look at revenue
-- AND customer satisfaction together -- e.g. is a high-revenue category
-- actually well-reviewed, or just high-volume?
--
-- Tables used: order_items, products, product_category_translation,
-- order_reviews, orders
--
-- New SQL concept introduced in this file:
--   - CTE (Common Table Expression), the `WITH name AS (...)` syntax: lets
--     you name a subquery and reuse it like a temporary table, only for the
--     duration of the one statement that follows it. Instead of nesting
--     subqueries inside each other (hard to read) or writing the same join
--     twice, we compute "revenue per category" and "review score per
--     category" as two separate, readable CTEs, then join those two much
--     smaller result sets together at the end. Order matters top to bottom:
--     a later CTE can reference an earlier one, same as this comment reads.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- CTE 1: revenue_by_category
-- Same join chain and status filter as file 1's category query.
-- ----------------------------------------------------------------------------
WITH revenue_by_category AS (
    SELECT
        pct.product_category_name_english AS category,
        COUNT(DISTINCT oi.order_id)       AS order_count,
        ROUND(SUM(oi.price)::numeric, 2)  AS total_revenue
    FROM order_items oi
    JOIN orders o ON o.order_id = oi.order_id
    JOIN products p ON p.product_id = oi.product_id
    JOIN product_category_translation pct
        ON pct.product_category_name = p.product_category_name
    WHERE o.order_status NOT IN ('canceled', 'unavailable')
    GROUP BY pct.product_category_name_english
),

-- ----------------------------------------------------------------------------
-- CTE 2: reviews_by_category
--
-- A review belongs to an ORDER, not to a specific item, so an order with
-- items from two different categories has its one review joined into BOTH
-- categories here -- there's no way to know from this data which item the
-- customer was actually reviewing. That's an accepted simplification, same
-- as the seller attribution quirk in file 3.
--
-- That fan-out also means a single review can appear more than once in this
-- join (once per matching order_item row), so we use COUNT(DISTINCT
-- r.review_pk) rather than COUNT(*) to report how many distinct reviews
-- actually fed the average -- COUNT(*) would double-count reviews on
-- multi-item orders and overstate how much feedback a category has.
-- AVG(r.review_score) itself isn't distorted by that duplication *within* a
-- single category (the same score repeated doesn't move its own average),
-- but the review_count column would be misleading without DISTINCT.
-- ----------------------------------------------------------------------------
reviews_by_category AS (
    SELECT
        pct.product_category_name_english   AS category,
        COUNT(DISTINCT r.review_pk)         AS review_count,
        ROUND(AVG(r.review_score)::numeric, 2) AS avg_review_score
    FROM order_reviews r
    JOIN orders o ON o.order_id = r.order_id
    JOIN order_items oi ON oi.order_id = o.order_id
    JOIN products p ON p.product_id = oi.product_id
    JOIN product_category_translation pct
        ON pct.product_category_name = p.product_category_name
    GROUP BY pct.product_category_name_english
)

-- ----------------------------------------------------------------------------
-- Final SELECT: join the two CTEs together on category.
-- LEFT JOIN from revenue (not INNER JOIN) so a category with sales but,
-- hypothetically, zero reviews still shows up instead of disappearing.
-- ----------------------------------------------------------------------------
SELECT
    rc.category,
    rc.order_count,
    rc.total_revenue,
    rv.review_count,
    rv.avg_review_score
FROM revenue_by_category rc
LEFT JOIN reviews_by_category rv ON rv.category = rc.category
ORDER BY rc.total_revenue DESC;
