-- ============================================================================
-- 02_geographic_breakdown.sql
--
-- Question: how does order volume, average delivery time, and revenue vary
-- by customer state? This feeds the Brazil choropleth map (the D3 "hero"
-- visualization) and its per-state tooltip, so the output needs to be one
-- row per state.
--
-- Tables used: orders, customers, order_items
--
-- New SQL concepts introduced in this file:
--   - Date subtraction     : subtracting one TIMESTAMP from another in
--                            Postgres gives back an INTERVAL (e.g. "12 days
--                            04:30:00"), not a plain number. That's useful
--                            for display but awkward to average or chart.
--   - EXTRACT(EPOCH FROM x): converts an INTERVAL into a number -- total
--                            seconds. Dividing by 86400 (seconds in a day)
--                            turns that into a plain number of days, which
--                            is what we actually want to aggregate and plot.
--   - AVG                  : same idea as SUM/COUNT from file 1, but takes
--                            the mean instead of the total.
--
-- Why two CTEs instead of one WHERE clause: order_count/avg_delivery_days
-- and total_revenue need genuinely DIFFERENT row filters, not just
-- different columns. Delivery time only means something for orders that
-- actually arrived, so that CTE restricts to order_status = 'delivered'.
-- Revenue should count every order that wasn't canceled/unavailable --
-- the same broader definition used everywhere else "total revenue" appears
-- in this project (01_sales_trends_overall.sql, the Overview KPI row) --
-- including orders still in transit. Forcing one WHERE clause to serve
-- both would either undercount revenue or let un-delivered orders into
-- the delivery-time average. Same technique as the two differently-scoped
-- CTEs in 04_category_performance.sql.
-- ============================================================================
WITH delivery_stats AS (
    SELECT
        c.customer_state                                            AS state,
        COUNT(DISTINCT o.order_id)                                  AS order_count,
        ROUND(
            AVG(
                EXTRACT(EPOCH FROM (o.order_delivered_customer_date - o.order_purchase_timestamp))
                / 86400
            )::numeric,
            1
        )                                                            AS avg_delivery_days
    FROM orders o
    JOIN customers c ON c.customer_id = o.customer_id
    WHERE o.order_status = 'delivered'
        AND o.order_delivered_customer_date IS NOT NULL
    GROUP BY c.customer_state
),

revenue_stats AS (
    SELECT
        c.customer_state                 AS state,
        ROUND(SUM(oi.price)::numeric, 2) AS total_revenue
    FROM orders o
    JOIN customers c ON c.customer_id = o.customer_id
    JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.order_status NOT IN ('canceled', 'unavailable')
    GROUP BY c.customer_state
)
SELECT
    ds.state,
    ds.order_count,
    ds.avg_delivery_days,
    rs.total_revenue
FROM delivery_stats ds
JOIN revenue_stats rs ON rs.state = ds.state
ORDER BY ds.order_count DESC;
