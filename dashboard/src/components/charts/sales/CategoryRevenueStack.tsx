import { useMemo, useState } from "react";
import { area, scaleLinear, scalePoint, stack } from "d3";
import { useJsonData } from "../../../lib/useJsonData";
import { useContainerWidth } from "../../../lib/useContainerWidth";
import { formatCategoryLabel, formatCurrencyCompact, formatMonth } from "../../../lib/format";
import { categorical } from "../../../lib/palette";
import type { SalesTrendByCategoryRow } from "../../../types/data";
import { ChartCard } from "../../layout/ChartCard";
import { Legend } from "../../layout/Legend";
import { Tooltip } from "../../layout/Tooltip";
import styles from "./SalesTrendLine.module.css";

const MARGIN = { top: 16, right: 16, bottom: 28, left: 64 };
const HEIGHT = 300;
const OTHER_COLOR = "#898781";
const TOP_N = 5;

interface MonthRow {
  month: string;
  values: Record<string, number>;
}

export function CategoryRevenueStack() {
  const { data } = useJsonData<SalesTrendByCategoryRow[]>("/data/01_sales_trends_by_category.json");
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const prepared = useMemo(() => {
    if (!data) return null;

    const totalsByCategory = new Map<string, number>();
    for (const row of data) {
      totalsByCategory.set(row.category, (totalsByCategory.get(row.category) ?? 0) + row.total_revenue);
    }
    const topCategories = [...totalsByCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N)
      .map(([category]) => category);
    const keys = [...topCategories, "Other"];

    const months = [...new Set(data.map((r) => r.month))].sort();
    const byMonth = new Map<string, Record<string, number>>();
    for (const month of months) {
      byMonth.set(month, Object.fromEntries(keys.map((k) => [k, 0])));
    }
    for (const row of data) {
      const bucket = topCategories.includes(row.category) ? row.category : "Other";
      const monthRow = byMonth.get(row.month);
      if (monthRow) monthRow[bucket] += row.total_revenue;
    }

    const stackInput: MonthRow[] = months.map((month) => ({ month, values: byMonth.get(month)! }));
    const stackGen = stack<MonthRow>()
      .keys(keys)
      .value((d, key) => d.values[key]);
    const series = stackGen(stackInput);

    return { keys, months, stackInput, series };
  }, [data]);

  const { x, y } = useMemo(() => {
    if (!prepared || innerWidth === 0) return { x: null, y: null };
    const xScale = scalePoint<string>().domain(prepared.months).range([0, innerWidth]);
    const maxY = Math.max(...prepared.series.flatMap((s) => s.map((d) => d[1])));
    const yScale = scaleLinear().domain([0, maxY]).nice().range([innerHeight, 0]);
    return { x: xScale, y: yScale };
  }, [prepared, innerWidth, innerHeight]);

  if (!data || !prepared) {
    return (
      <ChartCard title="Revenue by category">
        <div style={{ minHeight: HEIGHT }} />
      </ChartCard>
    );
  }

  const colorFor = (key: string, i: number) => (key === "Other" ? OTHER_COLOR : categorical.light[i]);

  const legendItems = prepared.keys.map((k, i) => ({
    label: k === "Other" ? "Other" : formatCategoryLabel(k),
    color: colorFor(k, i),
  }));

  const hoveredMonth = hoverIndex !== null ? prepared.months[hoverIndex] : null;
  const hoveredRow = hoveredMonth ? prepared.stackInput.find((r) => r.month === hoveredMonth) : null;

  const tableView = (
    <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
          <th style={{ padding: "6px 10px" }}>Month</th>
          {prepared.keys.map((k) => (
            <th key={k} style={{ padding: "6px 10px" }}>
              {k === "Other" ? "Other" : formatCategoryLabel(k)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {prepared.stackInput.map((row) => (
          <tr key={row.month} style={{ borderTop: "1px solid var(--gridline)" }}>
            <td style={{ padding: "6px 10px" }}>{formatMonth(row.month)}</td>
            {prepared.keys.map((k) => (
              <td key={k} style={{ padding: "6px 10px" }}>
                {formatCurrencyCompact(row.values[k])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ChartCard
      title="Revenue by category"
      subtitle="Top 5 categories by total revenue, remaining categories folded into Other"
      tableView={tableView}
      insight={
        <>
          Each colored band is one product category; at any point on the timeline, the bands
          stack up to that month's total revenue. Health & beauty, watches & gifts, and
          bed/bath/table have stayed the top revenue categories nearly every month since the
          marketplace matured in 2017 — a remarkably stable ranking even as total volume grows.
        </>
      }
    >
      <Legend items={legendItems} />
      <div ref={ref} className={styles.chartWrap}>
        {x && y && innerWidth > 0 && (
          <svg width="100%" height={HEIGHT} role="img" aria-label="Stacked area chart of revenue by category">
            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
              {y.ticks(5).map((t) => (
                <g key={t}>
                  <line x1={0} x2={innerWidth} y1={y(t)} y2={y(t)} className={styles.gridline} />
                  <text x={-8} y={y(t)} dy="0.32em" textAnchor="end" className={styles.axisLabel}>
                    {formatCurrencyCompact(t)}
                  </text>
                </g>
              ))}

              {prepared.months
                .filter((_, i) => i % 3 === 0)
                .map((m) => (
                  <text key={m} x={x(m)} y={innerHeight + 20} textAnchor="middle" className={styles.axisLabel}>
                    {formatMonth(m)}
                  </text>
                ))}

              {prepared.series.map((layer, i) => {
                const areaGen = area<(typeof layer)[number]>()
                  .x((d) => x(d.data.month) ?? 0)
                  .y0((d) => y(d[0]))
                  .y1((d) => y(d[1]));
                return (
                  <path
                    key={prepared.keys[i]}
                    d={areaGen(layer) ?? undefined}
                    fill={colorFor(prepared.keys[i], i)}
                    opacity={0.85}
                    stroke="var(--surface-1)"
                    strokeWidth={1}
                  />
                );
              })}

              {hoveredMonth && (
                <line
                  x1={x(hoveredMonth)}
                  x2={x(hoveredMonth)}
                  y1={0}
                  y2={innerHeight}
                  className={styles.crosshair}
                />
              )}

              <rect
                width={innerWidth}
                height={innerHeight}
                className={styles.hitArea}
                onPointerMove={(e) => {
                  const svgRect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                  if (!svgRect) return;
                  const px = e.clientX - svgRect.left - MARGIN.left;
                  const step = innerWidth / (prepared.months.length - 1);
                  const idx = Math.max(0, Math.min(prepared.months.length - 1, Math.round(px / step)));
                  setHoverIndex(idx);
                }}
                onPointerLeave={() => setHoverIndex(null)}
              />
            </g>
          </svg>
        )}

        {hoveredRow && hoveredMonth && x && (
          <Tooltip
            x={(x(hoveredMonth) ?? 0) + MARGIN.left}
            y={MARGIN.top}
            title={formatMonth(hoveredMonth)}
            containerWidth={width}
            rows={prepared.keys.map((k, i) => ({
              label: k === "Other" ? "Other" : formatCategoryLabel(k),
              value: formatCurrencyCompact(hoveredRow.values[k]),
              color: colorFor(k, i),
            }))}
          />
        )}
      </div>
    </ChartCard>
  );
}
