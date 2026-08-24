-- ============================================================================
-- 02_geographic_breakdown.sql
--
-- Question: how does order volume and average delivery time vary by
-- customer state? This feeds the Brazil choropleth map later (the D3 "hero"
-- visualization), so the output needs to be one row per state.
--
-- Tables used: orders, customers
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
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Order volume and average delivery time, by customer state
--
-- Delivery time only makes sense for orders that actually arrived, so we
-- restrict to order_status = 'delivered'. We also explicitly check
-- order_delivered_customer_date IS NOT NULL as a safety net -- in this
-- dataset every 'delivered' order does have that date populated, but
-- filtering on the date directly (rather than trusting the status label)
-- protects the query if that ever turned out not to be true.
-- ----------------------------------------------------------------------------
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
ORDER BY order_count DESC;
