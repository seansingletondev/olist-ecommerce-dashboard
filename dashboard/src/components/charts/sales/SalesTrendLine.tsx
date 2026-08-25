import { useMemo, useState } from "react";
import { area, line, scaleLinear, scalePoint } from "d3";
import { useJsonData } from "../../../lib/useJsonData";
import { useContainerWidth } from "../../../lib/useContainerWidth";
import { formatCount, formatCurrencyCompact, formatMonth } from "../../../lib/format";
import { sequentialBlue } from "../../../lib/palette";
import type { SalesTrendOverallRow } from "../../../types/data";
import { ChartCard } from "../../layout/ChartCard";
import { Tooltip } from "../../layout/Tooltip";
import styles from "./SalesTrendLine.module.css";

const MARGIN = { top: 16, right: 16, bottom: 28, left: 64 };
const HEIGHT = 300;
const LINE_COLOR = sequentialBlue[450];

export function SalesTrendLine() {
  const { data } = useJsonData<SalesTrendOverallRow[]>("/data/01_sales_trends_overall.json");
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const { x, y, linePath, areaPath, yTicks } = useMemo(() => {
    if (!data || innerWidth === 0) {
      return { x: null, y: null, linePath: "", areaPath: "", yTicks: [] as number[] };
    }
    const months = data.map((d) => d.month);
    const xScale = scalePoint<string>().domain(months).range([0, innerWidth]);
    const maxRevenue = Math.max(...data.map((d) => d.total_revenue));
    const yScale = scaleLinear().domain([0, maxRevenue]).nice().range([innerHeight, 0]);

    const lineGen = line<SalesTrendOverallRow>()
      .x((d) => xScale(d.month) ?? 0)
      .y((d) => yScale(d.total_revenue));
    const areaGen = area<SalesTrendOverallRow>()
      .x((d) => xScale(d.month) ?? 0)
      .y0(innerHeight)
      .y1((d) => yScale(d.total_revenue));

    return {
      x: xScale,
      y: yScale,
      linePath: lineGen(data) ?? "",
      areaPath: areaGen(data) ?? "",
      yTicks: yScale.ticks(5),
    };
  }, [data, innerWidth, innerHeight]);

  if (!data) {
    return (
      <ChartCard title="Monthly revenue">
        <div style={{ minHeight: HEIGHT }} />
      </ChartCard>
    );
  }

  const tableView = (
    <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
          <th style={{ padding: "6px 10px" }}>Month</th>
          <th style={{ padding: "6px 10px" }}>Orders</th>
          <th style={{ padding: "6px 10px" }}>Revenue</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.month} style={{ borderTop: "1px solid var(--gridline)" }}>
            <td style={{ padding: "6px 10px" }}>{formatMonth(row.month)}</td>
            <td style={{ padding: "6px 10px" }}>{formatCount(row.order_count)}</td>
            <td style={{ padding: "6px 10px" }}>{formatCurrencyCompact(row.total_revenue)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <ChartCard
      title="Monthly revenue"
      subtitle="Total order revenue by month, 2016-2018"
      tableView={tableView}
      insight={
        <>
          Revenue climbed steadily through 2017 before spiking sharply in November. That's Black
          Friday, the biggest single shopping event on the Brazilian retail calendar. The trickle
          of orders in late 2016 reflects Olist's real early-stage rollout, not missing data, and
          the drop after August 2018 is where the public dataset's export window ends, not a real
          collapse in sales.
        </>
      }
    >
      <div ref={ref} className={styles.chartWrap}>
        {x && y && innerWidth > 0 && (
          <svg width="100%" height={HEIGHT} role="img" aria-label="Line chart of monthly revenue">
            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
              {yTicks.map((t) => (
                <g key={t}>
                  <line x1={0} x2={innerWidth} y1={y(t)} y2={y(t)} className={styles.gridline} />
                  <text x={-8} y={y(t)} dy="0.32em" textAnchor="end" className={styles.axisLabel}>
                    {formatCurrencyCompact(t)}
                  </text>
                </g>
              ))}

              {data
                .filter((_, i) => i % 3 === 0)
                .map((d) => (
                  <text
                    key={d.month}
                    x={x(d.month)}
                    y={innerHeight + 20}
                    textAnchor="middle"
                    className={styles.axisLabel}
                  >
                    {formatMonth(d.month)}
                  </text>
                ))}

              <path d={areaPath} fill={LINE_COLOR} opacity={0.1} stroke="none" />
              <path d={linePath} fill="none" stroke={LINE_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

              {hovered && (
                <>
                  <line
                    x1={x(hovered.month)}
                    x2={x(hovered.month)}
                    y1={0}
                    y2={innerHeight}
                    className={styles.crosshair}
                  />
                  <circle
                    cx={x(hovered.month)}
                    cy={y(hovered.total_revenue)}
                    r={4}
                    fill={LINE_COLOR}
                    stroke="var(--surface-1)"
                    strokeWidth={2}
                  />
                </>
              )}

              <rect
                width={innerWidth}
                height={innerHeight}
                className={styles.hitArea}
                onPointerMove={(e) => {
                  const svgRect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                  if (!svgRect || !x) return;
                  const px = e.clientX - svgRect.left - MARGIN.left;
                  const step = innerWidth / (data.length - 1);
                  const idx = Math.max(0, Math.min(data.length - 1, Math.round(px / step)));
                  setHoverIndex(idx);
                }}
                onPointerLeave={() => setHoverIndex(null)}
              />
            </g>
          </svg>
        )}

        {hovered && x && (
          <Tooltip
            x={(x(hovered.month) ?? 0) + MARGIN.left}
            y={MARGIN.top}
            title={formatMonth(hovered.month)}
            containerWidth={width}
            rows={[
              { label: "Revenue", value: formatCurrencyCompact(hovered.total_revenue) },
              { label: "Orders", value: formatCount(hovered.order_count) },
            ]}
          />
        )}
      </div>
    </ChartCard>
  );
}
