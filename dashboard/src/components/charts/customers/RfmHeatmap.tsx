import { useMemo, useState } from "react";
import { useJsonData } from "../../../lib/useJsonData";
import { useContainerWidth } from "../../../lib/useContainerWidth";
import { sequentialScale } from "../../../lib/colorScales";
import { sequentialBlue } from "../../../lib/palette";
import { formatCount } from "../../../lib/format";
import type { RfmHeatmapRow } from "../../../types/data";
import { ChartCard } from "../../layout/ChartCard";
import { ScaleLegend } from "../../layout/ScaleLegend";
import { Tooltip } from "../../layout/Tooltip";

const MARGIN = { top: 8, right: 8, bottom: 32, left: 88 };
const GAP = 2;

export function RfmHeatmap() {
  const { data } = useJsonData<RfmHeatmapRow[]>("/data/06_customer_segmentation_rfm_heatmap.json");
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const [hoveredCell, setHoveredCell] = useState<{ r: number; m: number } | null>(null);

  const cellSize = Math.max(0, (width - MARGIN.left - MARGIN.right) / 5);
  const gridSize = cellSize * 5;

  const byCell = useMemo(() => {
    const map = new Map<string, number>();
    data?.forEach((row) => map.set(`${row.r_score}-${row.m_score}`, row.customer_count));
    return map;
  }, [data]);

  // Customer counts across the 25 cells are tightly clustered (roughly
  // 3.4K-4.1K -- see the insight text below) rather than spanning from
  // zero, so a domain of [0, max] would squeeze every real cell into a
  // narrow high-end sliver of the ramp and make them all look like nearly
  // the same shade. Scaling from the actual [min, max] instead stretches
  // that same real spread across the full light-to-dark range, so the
  // (real, if modest) differences between cells are actually visible.
  const [minCount, maxCount] = useMemo(() => {
    if (!data || data.length === 0) return [0, 0];
    const counts = data.map((d) => d.customer_count);
    return [Math.min(...counts), Math.max(...counts)];
  }, [data]);

  const colorScale = useMemo(() => {
    if (!data) return null;
    return sequentialScale([minCount, maxCount]);
  }, [data, minCount, maxCount]);

  if (!data || !colorScale) {
    return (
      <ChartCard title="Customers by recency &amp; spend quintile">
        <div style={{ minHeight: 320 }} />
      </ChartCard>
    );
  }

  const hoveredCount = hoveredCell ? byCell.get(`${hoveredCell.r}-${hoveredCell.m}`) ?? 0 : 0;

  const tableView = (
    <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
          <th style={{ padding: "6px 10px" }}>Recency quintile</th>
          <th style={{ padding: "6px 10px" }}>Monetary quintile</th>
          <th style={{ padding: "6px 10px" }}>Customers</th>
        </tr>
      </thead>
      <tbody>
        {[...data]
          .sort((a, b) => a.r_score - b.r_score || a.m_score - b.m_score)
          .map((row) => (
            <tr key={`${row.r_score}-${row.m_score}`} style={{ borderTop: "1px solid var(--gridline)" }}>
              <td style={{ padding: "6px 10px" }}>{row.r_score}</td>
              <td style={{ padding: "6px 10px" }}>{row.m_score}</td>
              <td style={{ padding: "6px 10px" }}>{formatCount(row.customer_count)}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );

  return (
    <ChartCard
      title="Customers by recency & spend quintile"
      subtitle="1 = least recent / lowest spend, 5 = most recent / highest spend"
      tableView={tableView}
      insight={
        <>
          Both axes split customers into five equal-sized groups (quintiles) from lowest to
          highest: R1 is the least-recently-active fifth of customers and R5 the most recent,
          while M1 is the lowest-spending fifth and M5 the highest. Customer counts spread fairly
          evenly across most recency-spend combinations rather than clustering in one dominant
          cell. There's no single "typical" Olist customer profile, which is exactly why scoring
          on multiple dimensions is more useful here than looking at any one metric alone.
        </>
      }
    >
      <div style={{ marginBottom: 10 }}>
        <ScaleLegend minLabel="Fewer customers" maxLabel="More customers" fromColor={sequentialBlue[150]} toColor={sequentialBlue[650]} />
      </div>
      <div ref={ref} style={{ position: "relative", width: "100%" }}>
        {gridSize > 0 && (
          <svg width="100%" height={gridSize + MARGIN.top + MARGIN.bottom} role="img" aria-label="Heatmap of customers by recency and monetary quintile">
            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
              <text x={-16} y={-16} fontSize={11} fill="var(--text-muted)">
                Recency →
              </text>
              {[5, 4, 3, 2, 1].map((r, rowIndex) => (
                <text key={r} x={-10} y={rowIndex * cellSize + cellSize / 2} dy="0.35em" textAnchor="end" fontSize={12} fill="var(--text-secondary)">
                  R{r}
                </text>
              ))}
              {[1, 2, 3, 4, 5].map((m, colIndex) => (
                <text key={m} x={colIndex * cellSize + cellSize / 2} y={gridSize + 20} textAnchor="middle" fontSize={12} fill="var(--text-secondary)">
                  M{m}
                </text>
              ))}

              {[5, 4, 3, 2, 1].map((r, rowIndex) =>
                [1, 2, 3, 4, 5].map((m, colIndex) => {
                  const count = byCell.get(`${r}-${m}`) ?? 0;
                  const t = maxCount > minCount ? (count - minCount) / (maxCount - minCount) : 0;
                  const textColor = t > 0.5 ? "white" : "var(--text-primary)";
                  const isHovered = hoveredCell?.r === r && hoveredCell?.m === m;
                  return (
                    <g
                      key={`${r}-${m}`}
                      tabIndex={0}
                      aria-label={`Recency quintile ${r}, monetary quintile ${m}: ${formatCount(count)} customers`}
                      onPointerEnter={() => setHoveredCell({ r, m })}
                      onPointerLeave={() => setHoveredCell(null)}
                      onFocus={() => setHoveredCell({ r, m })}
                      onBlur={() => setHoveredCell(null)}
                      style={{ cursor: "pointer" }}
                    >
                      <rect
                        x={colIndex * cellSize}
                        y={rowIndex * cellSize}
                        width={cellSize - GAP}
                        height={cellSize - GAP}
                        rx={4}
                        fill={colorScale(count)}
                        stroke={isHovered ? "var(--text-primary)" : "none"}
                        strokeWidth={2}
                      />
                      <text
                        x={colIndex * cellSize + cellSize / 2}
                        y={rowIndex * cellSize + cellSize / 2}
                        dy="0.35em"
                        textAnchor="middle"
                        fontSize={12}
                        fill={textColor}
                      >
                        {formatCount(count)}
                      </text>
                    </g>
                  );
                }),
              )}
            </g>
          </svg>
        )}

        {hoveredCell && (
          <Tooltip
            x={MARGIN.left + (hoveredCell.m - 1) * cellSize + cellSize}
            y={MARGIN.top + (5 - hoveredCell.r) * cellSize}
            title={`R${hoveredCell.r} · M${hoveredCell.m}`}
            containerWidth={width}
            rows={[{ label: "Customers", value: formatCount(hoveredCount) }]}
          />
        )}
      </div>
    </ChartCard>
  );
}
