import { useMemo } from "react";
import { useJsonData } from "../../../lib/useJsonData";
import { sequentialScale } from "../../../lib/colorScales";
import { formatCount, formatPercent } from "../../../lib/format";
import { formatStateLabel } from "../../../lib/brazilStates";
import type { DeliveryPerformanceByStateRow } from "../../../types/data";
import { ChartCard } from "../../layout/ChartCard";
import { HorizontalBarChart, type BarItem } from "../shared/HorizontalBarChart";

export function DeliveryStateBar() {
  const { data } = useJsonData<DeliveryPerformanceByStateRow[]>(
    "/data/03_delivery_performance_by_state.json",
  );

  const items: BarItem[] = useMemo(() => {
    if (!data) return [];
    const sorted = [...data].sort((a, b) => b.pct_late - a.pct_late);
    const colorScale = sequentialScale([0, Math.max(...data.map((d) => d.pct_late))]);
    return sorted.map((row) => ({
      id: row.state,
      label: formatStateLabel(row.state),
      value: row.pct_late,
      color: colorScale(row.pct_late),
      extraTooltipRows: [{ label: "Delivered orders", value: formatCount(row.delivered_order_count) }],
    }));
  }, [data]);

  if (!data) {
    return (
      <ChartCard title="Late deliveries by state">
        <div style={{ minHeight: 200 }} />
      </ChartCard>
    );
  }

  const tableView = (
    <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
          <th style={{ padding: "6px 10px" }}>State</th>
          <th style={{ padding: "6px 10px" }}>Delivered orders</th>
          <th style={{ padding: "6px 10px" }}>% late</th>
        </tr>
      </thead>
      <tbody>
        {[...data]
          .sort((a, b) => b.pct_late - a.pct_late)
          .map((row) => (
            <tr key={row.state} style={{ borderTop: "1px solid var(--gridline)" }}>
              <td style={{ padding: "6px 10px" }}>{formatStateLabel(row.state)}</td>
              <td style={{ padding: "6px 10px" }}>{formatCount(row.delivered_order_count)}</td>
              <td style={{ padding: "6px 10px" }}>{formatPercent(row.pct_late)}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );

  return (
    <ChartCard
      title="Late deliveries by state"
      subtitle="Share of delivered orders that arrived after the estimate, by customer state"
      tableView={tableView}
      insight={
        <>
          "Late" means the order arrived after the date Olist originally promised the customer.
          The states with the longest absolute delivery times — remote, Amazon-region states like
          Roraima and Amapá — actually have some of the lowest late-delivery rates: Olist's
          estimates already build in generous buffers for distance, so these orders take longer
          in real time but are more likely to arrive within their (longer) promised window than
          orders to closer, more tightly-estimated states.
        </>
      }
    >
      <HorizontalBarChart items={items} formatValue={formatPercent} labelWidth={200} />
    </ChartCard>
  );
}
