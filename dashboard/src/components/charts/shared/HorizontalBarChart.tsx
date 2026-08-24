import { useState } from "react";
import { scaleLinear } from "d3";
import { useContainerWidth } from "../../../lib/useContainerWidth";
import { Tooltip } from "../../layout/Tooltip";

export interface BarItem {
  id: string;
  label: string;
  value: number;
  color: string;
  /** Extra tooltip rows beyond the main value (e.g. sample size). */
  extraTooltipRows?: { label: string; value: string }[];
}

interface HorizontalBarChartProps {
  items: BarItem[];
  formatValue: (v: number) => string;
  /** Fixed domain max (e.g. 100 for a percentage) -- defaults to the largest item value. */
  domainMax?: number;
}

const BAR_HEIGHT = 20;
const BAR_GAP = 8;
const MARGIN = { top: 4, right: 56, bottom: 4, left: 0 };
const LABEL_WIDTH = 132;

/**
 * A sequential-color horizontal bar chart -- magnitude comparison across
 * categories, per the dataviz skill's "compare magnitude, low -> high"
 * form. Each bar is its own hover/focus hit target (no crosshair, per the
 * interaction spec for bar charts), and the value is labeled at the bar's
 * tip since these lists are short enough for direct labels to stay legible.
 */
export function HorizontalBarChart({ items, formatValue, domainMax }: HorizontalBarChartProps) {
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right - LABEL_WIDTH);
  const height = items.length * (BAR_HEIGHT + BAR_GAP) - BAR_GAP + MARGIN.top + MARGIN.bottom;

  const max = domainMax ?? Math.max(...items.map((d) => d.value), 0);
  const x = scaleLinear().domain([0, max]).range([0, plotWidth]);

  const hoveredItem = items.find((d) => d.id === hoveredId);
  const hoveredIndex = items.findIndex((d) => d.id === hoveredId);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      {width > 0 && (
        <svg width="100%" height={height} role="img" aria-label="Horizontal bar chart">
          <g transform={`translate(${MARGIN.left + LABEL_WIDTH},${MARGIN.top})`}>
            {items.map((item, i) => {
              const y = i * (BAR_HEIGHT + BAR_GAP);
              const barWidth = Math.max(0, x(item.value));
              return (
                <g
                  key={item.id}
                  tabIndex={0}
                  aria-label={`${item.label}: ${formatValue(item.value)}`}
                  onPointerEnter={() => setHoveredId(item.id)}
                  onPointerLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(item.id)}
                  onBlur={() => setHoveredId(null)}
                  style={{ cursor: "pointer" }}
                >
                  <text
                    x={-10}
                    y={y + BAR_HEIGHT / 2}
                    dy="0.35em"
                    textAnchor="end"
                    fontSize={12}
                    fill={hoveredId === item.id ? "var(--text-primary)" : "var(--text-secondary)"}
                  >
                    {item.label}
                  </text>
                  <rect
                    x={0}
                    y={y}
                    width={barWidth}
                    height={BAR_HEIGHT}
                    rx={4}
                    fill={item.color}
                    opacity={hoveredId === null || hoveredId === item.id ? 1 : 0.55}
                  />
                  <text
                    x={barWidth + 8}
                    y={y + BAR_HEIGHT / 2}
                    dy="0.35em"
                    fontSize={12}
                    fill="var(--text-secondary)"
                  >
                    {formatValue(item.value)}
                  </text>
                  {/* Larger, invisible hit area so short/empty bars are still easy to hover. */}
                  <rect x={0} y={y - 2} width={plotWidth + 60} height={BAR_HEIGHT + 4} fill="transparent" />
                </g>
              );
            })}
          </g>
        </svg>
      )}

      {hoveredItem && hoveredIndex >= 0 && (
        <Tooltip
          x={LABEL_WIDTH + x(hoveredItem.value) + 20}
          y={hoveredIndex * (BAR_HEIGHT + BAR_GAP)}
          title={hoveredItem.label}
          containerWidth={width}
          rows={[
            { label: "Value", value: formatValue(hoveredItem.value), color: hoveredItem.color },
            ...(hoveredItem.extraTooltipRows ?? []),
          ]}
        />
      )}
    </div>
  );
}
