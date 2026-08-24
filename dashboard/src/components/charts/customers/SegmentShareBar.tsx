import { useMemo, useState } from "react";
import { useJsonData } from "../../../lib/useJsonData";
import { useContainerWidth } from "../../../lib/useContainerWidth";
import { SEGMENT_COLOR, SEGMENT_LABEL, SEGMENT_ORDER } from "../../../lib/rfmSegments";
import { formatCount, formatPercent } from "../../../lib/format";
import type { RfmSummaryRow } from "../../../types/data";
import { ChartCard } from "../../layout/ChartCard";
import { Tooltip } from "../../layout/Tooltip";

const HEIGHT = 40;
const GAP = 2; // the "surface gap" separating touching stacked segments, per the dataviz skill's mark spec

export function SegmentShareBar() {
  const { data } = useJsonData<RfmSummaryRow[]>("/data/06_customer_segmentation_rfm_summary.json");
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  const ordered = useMemo(() => {
    if (!data) return [];
    const bySegment = new Map(data.map((r) => [r.segment, r]));
    return SEGMENT_ORDER.map((s) => bySegment.get(s)).filter((r): r is RfmSummaryRow => !!r);
  }, [data]);

  const total = ordered.reduce((sum, r) => sum + r.customer_count, 0);

  if (!data) {
    return (
      <ChartCard title="Customers by segment">
        <div style={{ minHeight: HEIGHT + 40 }} />
      </ChartCard>
    );
  }

  const hovered = ordered.find((r) => r.segment === hoveredSegment);

  const segments = ordered.reduce<{ row: RfmSummaryRow; xStart: number; w: number }[]>((acc, row) => {
    const xStart = acc.length > 0 ? acc[acc.length - 1].xStart + acc[acc.length - 1].w : 0;
    const w = total > 0 ? (row.customer_count / total) * width : 0;
    return [...acc, { row, xStart, w }];
  }, []);

  const tableView = (
    <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
          <th style={{ padding: "6px 10px" }}>Segment</th>
          <th style={{ padding: "6px 10px" }}>Customers</th>
          <th style={{ padding: "6px 10px" }}>Share</th>
        </tr>
      </thead>
      <tbody>
        {ordered.map((row) => (
          <tr key={row.segment} style={{ borderTop: "1px solid var(--gridline)" }}>
            <td style={{ padding: "6px 10px" }}>{SEGMENT_LABEL[row.segment]}</td>
            <td style={{ padding: "6px 10px" }}>{formatCount(row.customer_count)}</td>
            <td style={{ padding: "6px 10px" }}>{formatPercent((row.customer_count / total) * 100)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ChartCard
      title="Customers by segment"
      subtitle={`${formatCount(total)} customers scored on Recency, Frequency, and Monetary value`}
      tableView={tableView}
      insight={
        <>
          <p>
            This section scores every customer on three dimensions — Recency (how long since
            their last order), Frequency (how many orders they've placed), and Monetary value
            (how much they've spent) — together called RFM analysis, a standard way of grouping
            customers by actual buying behavior instead of guesswork:
          </p>
          <ul>
            <li>
              <strong>Champions</strong> score well across all three.
            </li>
            <li>
              <strong>Loyal</strong> customers are solid, dependable buyers a step behind.
            </li>
            <li>
              <strong>At risk</strong> customers haven't ordered in a while and may be drifting
              away.
            </li>
            <li>
              <strong>Hibernating</strong> customers have gone the longest without ordering and
              are effectively inactive.
            </li>
          </ul>
          <p>
            Only about 16% of customers qualify as Champions, while nearly 40% have drifted into
            At risk — a reminder that most of this marketplace is built on customers who bought
            once and never came back, not repeat buyers.
          </p>
        </>
      }
    >
      <div ref={ref} style={{ position: "relative", width: "100%" }}>
        {width > 0 && (
          <svg width="100%" height={HEIGHT} role="img" aria-label="Stacked bar of customers by RFM segment">
            {segments.map(({ row, xStart, w }) => {
              const isHovered = hoveredSegment === row.segment;
              const barW = Math.max(0, w - GAP);
              const pct = (row.customer_count / total) * 100;
              const labelFits = barW > 70;
              return (
                <g
                  key={row.segment}
                  tabIndex={0}
                  aria-label={`${SEGMENT_LABEL[row.segment]}: ${formatCount(row.customer_count)} customers (${formatPercent(pct)})`}
                  onPointerEnter={() => setHoveredSegment(row.segment)}
                  onPointerLeave={() => setHoveredSegment(null)}
                  onFocus={() => setHoveredSegment(row.segment)}
                  onBlur={() => setHoveredSegment(null)}
                  style={{ cursor: "pointer" }}
                >
                  <rect
                    x={xStart}
                    y={0}
                    width={barW}
                    height={HEIGHT}
                    rx={4}
                    fill={SEGMENT_COLOR[row.segment]}
                    opacity={isHovered ? 1 : 0.85}
                  />
                  {labelFits && (
                    <text x={xStart + barW / 2} y={HEIGHT / 2} dy="0.35em" textAnchor="middle" fontSize={12} fill="white">
                      {SEGMENT_LABEL[row.segment]} · {formatPercent(pct, 0)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {hovered && (
          <Tooltip
            x={(segments.find((s) => s.row.segment === hovered.segment)?.xStart ?? 0) + 12}
            y={HEIGHT + 8}
            title={SEGMENT_LABEL[hovered.segment]}
            containerWidth={width}
            rows={[
              { label: "Customers", value: formatCount(hovered.customer_count) },
              { label: "Share", value: formatPercent((hovered.customer_count / total) * 100) },
            ]}
          />
        )}
      </div>
    </ChartCard>
  );
}
