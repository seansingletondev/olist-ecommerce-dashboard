import { useMemo, useState } from "react";
import { scaleLinear, scaleLog, scaleSqrt } from "d3";
import { useJsonData } from "../../../lib/useJsonData";
import { useContainerWidth } from "../../../lib/useContainerWidth";
import { sequentialBlue } from "../../../lib/palette";
import { formatCategoryLabel, formatCount, formatCurrencyCompact } from "../../../lib/format";
import type { CategoryPerformanceRow } from "../../../types/data";
import { ChartCard } from "../../layout/ChartCard";
import { Tooltip } from "../../layout/Tooltip";

const MARGIN = { top: 16, right: 24, bottom: 36, left: 48 };
const HEIGHT = 360;
const TOP_N = 25;
const BUBBLE_COLOR = sequentialBlue[450];

export function CategoryBubble() {
  const { data } = useJsonData<CategoryPerformanceRow[]>("/data/04_category_performance.json");
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const rows = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => b.total_revenue - a.total_revenue).slice(0, TOP_N);
  }, [data]);

  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const { x, y, r } = useMemo(() => {
    if (rows.length === 0 || innerWidth === 0) return { x: null, y: null, r: null };
    const revenueExtent: [number, number] = [
      Math.min(...rows.map((d) => d.total_revenue)) * 0.85,
      Math.max(...rows.map((d) => d.total_revenue)) * 1.05,
    ];
    const scoreExtent: [number, number] = [
      Math.min(...rows.map((d) => d.avg_review_score)) - 0.1,
      Math.max(...rows.map((d) => d.avg_review_score)) + 0.1,
    ];
    const xScale = scaleLog().domain(revenueExtent).range([0, innerWidth]);
    const yScale = scaleLinear().domain(scoreExtent).range([innerHeight, 0]);
    const rScale = scaleSqrt()
      .domain([0, Math.max(...rows.map((d) => d.order_count))])
      .range([4, 30]);
    return { x: xScale, y: yScale, r: rScale };
  }, [rows, innerWidth, innerHeight]);

  if (!data) {
    return (
      <ChartCard title="Category performance: revenue vs. review score">
        <div style={{ minHeight: HEIGHT }} />
      </ChartCard>
    );
  }

  const hovered = rows.find((d) => d.category === hoveredCategory);

  return (
    <ChartCard
      title="Category performance: revenue vs. review score"
      subtitle="Top 25 categories by revenue. Bubble size = order volume. Full list in the table below."
      insight={
        <>
          Each bubble is one product category: its position left-to-right is total revenue,
          up-and-down is average review score, and its size is order volume. Revenue is heavily
          concentrated in a handful of categories, but review scores stay fairly uniform across
          nearly all of them. A top-revenue category isn't necessarily a better-reviewed one.
          Office furniture stands out as a real outlier: real order volume, but the lowest average
          review score of any major category.
        </>
      }
    >
      <div ref={ref} style={{ position: "relative", width: "100%" }}>
        {x && y && r && (
          <svg width="100%" height={HEIGHT} role="img" aria-label="Bubble chart of category revenue vs review score">
            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
              {y.ticks(5).map((t) => (
                <g key={t}>
                  <line x1={0} x2={innerWidth} y1={y(t)} y2={y(t)} stroke="var(--gridline)" strokeWidth={1} />
                  <text x={-8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--text-muted)">
                    {t.toFixed(1)}
                  </text>
                </g>
              ))}
              {x.ticks(4).map((t) => (
                <text key={t} x={x(t)} y={innerHeight + 20} textAnchor="middle" fontSize={11} fill="var(--text-muted)">
                  {formatCurrencyCompact(t)}
                </text>
              ))}
              <text
                x={-innerHeight / 2}
                y={-34}
                transform="rotate(-90)"
                textAnchor="middle"
                fontSize={11}
                fill="var(--text-muted)"
              >
                Avg. review score
              </text>

              {rows.map((row) => {
                const isHovered = hoveredCategory === row.category;
                return (
                  <g
                    key={row.category}
                    tabIndex={0}
                    aria-label={`${formatCategoryLabel(row.category)}: ${formatCurrencyCompact(row.total_revenue)} revenue, ${row.avg_review_score.toFixed(2)} avg score, ${formatCount(row.order_count)} orders`}
                    onPointerEnter={() => setHoveredCategory(row.category)}
                    onPointerLeave={() => setHoveredCategory(null)}
                    onFocus={() => setHoveredCategory(row.category)}
                    onBlur={() => setHoveredCategory(null)}
                    style={{ cursor: "pointer" }}
                  >
                    <circle
                      cx={x(row.total_revenue)}
                      cy={y(row.avg_review_score)}
                      r={Math.max(r(row.order_count), 12)}
                      fill="transparent"
                    />
                    <circle
                      cx={x(row.total_revenue)}
                      cy={y(row.avg_review_score)}
                      r={r(row.order_count)}
                      fill={BUBBLE_COLOR}
                      opacity={isHovered ? 0.85 : 0.55}
                      stroke={BUBBLE_COLOR}
                      strokeOpacity={isHovered ? 1 : 0}
                      strokeWidth={2}
                    />
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        {hovered && x && y && (
          <Tooltip
            x={MARGIN.left + x(hovered.total_revenue) + 16}
            y={MARGIN.top + y(hovered.avg_review_score)}
            title={formatCategoryLabel(hovered.category)}
            containerWidth={width}
            rows={[
              { label: "Revenue", value: formatCurrencyCompact(hovered.total_revenue) },
              { label: "Avg. score", value: hovered.avg_review_score.toFixed(2) },
              { label: "Orders", value: formatCount(hovered.order_count) },
            ]}
          />
        )}
      </div>
    </ChartCard>
  );
}
