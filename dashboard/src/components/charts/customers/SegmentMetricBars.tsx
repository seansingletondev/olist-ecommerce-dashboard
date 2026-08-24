import { useMemo } from "react";
import { useJsonData } from "../../../lib/useJsonData";
import { SEGMENT_COLOR, SEGMENT_LABEL, SEGMENT_ORDER } from "../../../lib/rfmSegments";
import { formatCurrencyCompact } from "../../../lib/format";
import type { RfmSummaryRow } from "../../../types/data";
import { ChartCard } from "../../layout/ChartCard";
import { HorizontalBarChart, type BarItem } from "../shared/HorizontalBarChart";

export function SegmentMetricBars() {
  const { data } = useJsonData<RfmSummaryRow[]>("/data/06_customer_segmentation_rfm_summary.json");

  const ordered = useMemo(() => {
    if (!data) return [];
    const bySegment = new Map(data.map((r) => [r.segment, r]));
    return SEGMENT_ORDER.map((s) => bySegment.get(s)).filter((r): r is RfmSummaryRow => !!r);
  }, [data]);

  if (!data) {
    return (
      <ChartCard title="Recency &amp; spend by segment">
        <div style={{ minHeight: 220 }} />
      </ChartCard>
    );
  }

  const recencyItems: BarItem[] = ordered.map((row) => ({
    id: row.segment,
    label: SEGMENT_LABEL[row.segment],
    value: row.avg_recency_days,
    color: SEGMENT_COLOR[row.segment],
  }));

  const monetaryItems: BarItem[] = ordered.map((row) => ({
    id: row.segment,
    label: SEGMENT_LABEL[row.segment],
    value: row.avg_monetary,
    color: SEGMENT_COLOR[row.segment],
  }));

  return (
    <ChartCard
      title="Recency & spend by segment"
      subtitle="Average days since last order, and average lifetime spend, per segment"
    >
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 6px" }}>Avg. days since last order</p>
      <HorizontalBarChart items={recencyItems} formatValue={(v) => `${Math.round(v)}d`} />
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "18px 0 6px" }}>Avg. total spend</p>
      <HorizontalBarChart items={monetaryItems} formatValue={formatCurrencyCompact} />
    </ChartCard>
  );
}
