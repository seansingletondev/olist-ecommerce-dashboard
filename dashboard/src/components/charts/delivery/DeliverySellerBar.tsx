import { useMemo } from "react";
import { useJsonData } from "../../../lib/useJsonData";
import { sequentialScale } from "../../../lib/colorScales";
import { formatCount, formatPercent, truncateId } from "../../../lib/format";
import type { DeliveryPerformanceBySellerRow } from "../../../types/data";
import { ChartCard } from "../../layout/ChartCard";
import { HorizontalBarChart, type BarItem } from "../shared/HorizontalBarChart";

export function DeliverySellerBar() {
  const { data } = useJsonData<DeliveryPerformanceBySellerRow[]>(
    "/data/03_delivery_performance_by_seller.json",
  );

  const items: BarItem[] = useMemo(() => {
    if (!data) return [];
    // Already the worst 20 (by pct_late, min 20 orders) from the SQL query itself.
    const sorted = [...data].sort((a, b) => b.pct_late - a.pct_late);
    const colorScale = sequentialScale([0, Math.max(...data.map((d) => d.pct_late))]);
    return sorted.map((row) => ({
      id: row.seller_id,
      label: truncateId(row.seller_id),
      value: row.pct_late,
      color: colorScale(row.pct_late),
      extraTooltipRows: [{ label: "Delivered orders", value: formatCount(row.delivered_order_count) }],
    }));
  }, [data]);

  if (!data) {
    return (
      <ChartCard title="Sellers with the most late deliveries">
        <div style={{ minHeight: 200 }} />
      </ChartCard>
    );
  }

  const tableView = (
    <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
          <th style={{ padding: "6px 10px" }}>Seller ID</th>
          <th style={{ padding: "6px 10px" }}>Delivered orders</th>
          <th style={{ padding: "6px 10px" }}>% late</th>
        </tr>
      </thead>
      <tbody>
        {[...data]
          .sort((a, b) => b.pct_late - a.pct_late)
          .map((row) => (
            <tr key={row.seller_id} style={{ borderTop: "1px solid var(--gridline)" }}>
              <td style={{ padding: "6px 10px", fontFamily: "monospace", fontSize: 12 }}>{row.seller_id}</td>
              <td style={{ padding: "6px 10px" }}>{formatCount(row.delivered_order_count)}</td>
              <td style={{ padding: "6px 10px" }}>{formatPercent(row.pct_late)}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );

  return (
    <ChartCard
      title="Sellers with the most late deliveries"
      subtitle="Worst 20 sellers by late-delivery rate (min. 20 delivered orders)"
      tableView={tableView}
    >
      <HorizontalBarChart items={items} formatValue={formatPercent} />
    </ChartCard>
  );
}
