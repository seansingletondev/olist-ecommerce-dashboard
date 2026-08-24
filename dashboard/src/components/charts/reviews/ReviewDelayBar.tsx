import { useMemo } from "react";
import { useJsonData } from "../../../lib/useJsonData";
import { sequentialBlue } from "../../../lib/palette";
import { formatCount } from "../../../lib/format";
import type { ReviewAnalysisByDelayRow } from "../../../types/data";
import { ChartCard } from "../../layout/ChartCard";
import { HorizontalBarChart, type BarItem } from "../shared/HorizontalBarChart";

const BUCKET_LABEL: Record<ReviewAnalysisByDelayRow["delay_bucket"], string> = {
  early_or_on_time: "Early / on time",
  "1_to_3_days_late": "1-3 days late",
  "4_to_7_days_late": "4-7 days late",
  "8_to_14_days_late": "8-14 days late",
  "15_plus_days_late": "15+ days late",
};

// Ordinal ramp: light -> dark across the ordered buckets, per the dataviz
// skill's ordinal-ramp rule (not sorted by value -- order IS the meaning).
const BUCKET_COLOR = [
  sequentialBlue[250],
  sequentialBlue[350],
  sequentialBlue[450],
  sequentialBlue[550],
  sequentialBlue[650],
];

export function ReviewDelayBar() {
  const { data } = useJsonData<ReviewAnalysisByDelayRow[]>("/data/05_review_analysis_by_delay.json");

  const items: BarItem[] = useMemo(() => {
    if (!data) return [];
    // Keep the SQL query's own order (early -> late) -- this axis is
    // ordinal, not sorted by magnitude.
    return data.map((row, i) => ({
      id: row.delay_bucket,
      label: BUCKET_LABEL[row.delay_bucket],
      value: row.avg_review_score,
      color: BUCKET_COLOR[i] ?? sequentialBlue[450],
      extraTooltipRows: [{ label: "Reviews", value: formatCount(row.review_count) }],
    }));
  }, [data]);

  if (!data) {
    return (
      <ChartCard title="Review score by delivery delay">
        <div style={{ minHeight: 200 }} />
      </ChartCard>
    );
  }

  const tableView = (
    <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
          <th style={{ padding: "6px 10px" }}>Delay</th>
          <th style={{ padding: "6px 10px" }}>Reviews</th>
          <th style={{ padding: "6px 10px" }}>Avg. score</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.delay_bucket} style={{ borderTop: "1px solid var(--gridline)" }}>
            <td style={{ padding: "6px 10px" }}>{BUCKET_LABEL[row.delay_bucket]}</td>
            <td style={{ padding: "6px 10px" }}>{formatCount(row.review_count)}</td>
            <td style={{ padding: "6px 10px" }}>{row.avg_review_score.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ChartCard
      title="Review score by delivery delay"
      subtitle="Average review score (1-5), by how late the delivery was"
      tableView={tableView}
    >
      <HorizontalBarChart items={items} formatValue={(v) => v.toFixed(2)} domainMax={5} />
    </ChartCard>
  );
}
