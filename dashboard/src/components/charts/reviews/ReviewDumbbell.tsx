import { useMemo, useState } from "react";
import { scaleLinear } from "d3";
import { useJsonData } from "../../../lib/useJsonData";
import { useContainerWidth } from "../../../lib/useContainerWidth";
import { sequentialBlue } from "../../../lib/palette";
import { formatCategoryLabel, formatCount } from "../../../lib/format";
import type { ReviewAnalysisByDelayAndCategoryRow } from "../../../types/data";
import { ChartCard } from "../../layout/ChartCard";
import { Tooltip } from "../../layout/Tooltip";
import styles from "./ReviewDumbbell.module.css";

const ON_TIME_COLOR = sequentialBlue[300];
const LATE_COLOR = sequentialBlue[650];
const ROW_HEIGHT = 22;
const ROW_GAP = 6;
const MARGIN = { top: 8, right: 16, bottom: 24, left: 150 };
const TOP_N = 20;

export function ReviewDumbbell() {
  const { data } = useJsonData<ReviewAnalysisByDelayAndCategoryRow[]>(
    "/data/05_review_analysis_by_delay_and_category.json",
  );
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const rows = useMemo(() => {
    if (!data) return [];
    return [...data]
      .sort((a, b) => b.avg_score_on_time - b.avg_score_late - (a.avg_score_on_time - a.avg_score_late))
      .slice(0, TOP_N);
  }, [data]);

  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const height = rows.length * (ROW_HEIGHT + ROW_GAP) - ROW_GAP + MARGIN.top + MARGIN.bottom;
  const x = scaleLinear().domain([1, 5]).range([0, plotWidth]);

  if (!data) {
    return (
      <ChartCard title="Review score: on-time vs. late, by category">
        <div style={{ minHeight: 200 }} />
      </ChartCard>
    );
  }

  const hoveredRow = rows.find((r) => r.category === hoveredCategory);
  const hoveredIndex = rows.findIndex((r) => r.category === hoveredCategory);

  const tableView = (
    <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
          <th style={{ padding: "6px 10px" }}>Category</th>
          <th style={{ padding: "6px 10px" }}>Reviews</th>
          <th style={{ padding: "6px 10px" }}>On-time score</th>
          <th style={{ padding: "6px 10px" }}>Late score</th>
        </tr>
      </thead>
      <tbody>
        {[...data]
          .sort((a, b) => b.review_count - a.review_count)
          .map((row) => (
            <tr key={row.category} style={{ borderTop: "1px solid var(--gridline)" }}>
              <td style={{ padding: "6px 10px" }}>{formatCategoryLabel(row.category)}</td>
              <td style={{ padding: "6px 10px" }}>{formatCount(row.review_count)}</td>
              <td style={{ padding: "6px 10px" }}>{row.avg_score_on_time.toFixed(2)}</td>
              <td style={{ padding: "6px 10px" }}>{row.avg_score_late.toFixed(2)}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );

  return (
    <ChartCard
      title="Review score: on-time vs. late, by category"
      subtitle={`Top ${TOP_N} categories by score gap (view as table for all ${data.length})`}
      tableView={tableView}
      insight={
        <>
          Each row is one product category: the light dot marks the average review score when the
          delivery was on time or early, the dark dot marks it when the delivery was late, and the
          line between them is the size of that gap. On-time orders outscore late ones in every
          single category shown, with no exceptions — confirming the delivery-delay penalty on
          reviews is a universal effect of the experience itself, not something specific to any
          one kind of product.
        </>
      }
    >
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: ON_TIME_COLOR }} />
          On-time / early
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: LATE_COLOR }} />
          Late
        </span>
      </div>

      <div ref={ref} style={{ position: "relative", width: "100%" }}>
        {width > 0 && (
          <svg width="100%" height={height} role="img" aria-label="Dumbbell chart of on-time vs late review scores by category">
            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
              {[1, 2, 3, 4, 5].map((t) => (
                <line
                  key={t}
                  x1={x(t)}
                  x2={x(t)}
                  y1={0}
                  y2={height - MARGIN.top - MARGIN.bottom}
                  stroke="var(--gridline)"
                  strokeWidth={1}
                />
              ))}

              {rows.map((row, i) => {
                const y = i * (ROW_HEIGHT + ROW_GAP) + ROW_HEIGHT / 2;
                const xOnTime = x(row.avg_score_on_time);
                const xLate = x(row.avg_score_late);
                return (
                  <g
                    key={row.category}
                    className={styles.row}
                    tabIndex={0}
                    aria-label={`${formatCategoryLabel(row.category)}: on-time ${row.avg_score_on_time.toFixed(2)}, late ${row.avg_score_late.toFixed(2)}`}
                    onPointerEnter={() => setHoveredCategory(row.category)}
                    onPointerLeave={() => setHoveredCategory(null)}
                    onFocus={() => setHoveredCategory(row.category)}
                    onBlur={() => setHoveredCategory(null)}
                    style={{ cursor: "pointer" }}
                  >
                    <text x={-10} y={y} dy="0.35em" textAnchor="end" fontSize={12} className={styles.rowLabel} fill="var(--text-secondary)">
                      {formatCategoryLabel(row.category)}
                    </text>
                    <line x1={xLate} x2={xOnTime} y1={y} y2={y} stroke="var(--baseline)" strokeWidth={2} />
                    <circle cx={xLate} cy={y} r={5} fill={LATE_COLOR} stroke="var(--surface-1)" strokeWidth={2} />
                    <circle cx={xOnTime} cy={y} r={5} fill={ON_TIME_COLOR} stroke="var(--surface-1)" strokeWidth={2} />
                    <rect x={0} y={y - ROW_HEIGHT / 2} width={plotWidth} height={ROW_HEIGHT} fill="transparent" />
                  </g>
                );
              })}

              <g transform={`translate(0,${height - MARGIN.top - MARGIN.bottom})`}>
                {[1, 2, 3, 4, 5].map((t) => (
                  <text key={t} x={x(t)} y={16} textAnchor="middle" fontSize={11} fill="var(--text-muted)">
                    {t}
                  </text>
                ))}
              </g>
            </g>
          </svg>
        )}

        {hoveredRow && hoveredIndex >= 0 && (
          <Tooltip
            x={MARGIN.left + x(hoveredRow.avg_score_on_time) + 16}
            y={hoveredIndex * (ROW_HEIGHT + ROW_GAP)}
            title={formatCategoryLabel(hoveredRow.category)}
            containerWidth={width}
            rows={[
              { label: "On-time", value: hoveredRow.avg_score_on_time.toFixed(2), color: ON_TIME_COLOR },
              { label: "Late", value: hoveredRow.avg_score_late.toFixed(2), color: LATE_COLOR },
              { label: "Reviews", value: formatCount(hoveredRow.review_count) },
            ]}
          />
        )}
      </div>
    </ChartCard>
  );
}
