import { geoMercator, geoPath } from "d3";
import { useMemo, useState } from "react";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { useJsonData } from "../../../lib/useJsonData";
import { useContainerWidth } from "../../../lib/useContainerWidth";
import { sequentialScale } from "../../../lib/colorScales";
import { sequentialBlue } from "../../../lib/palette";
import { formatCount } from "../../../lib/format";
import type { GeographicBreakdownRow } from "../../../types/data";
import { ChartCard } from "../../layout/ChartCard";
import { ScaleLegend } from "../../layout/ScaleLegend";
import { Tooltip } from "../../layout/Tooltip";
import styles from "./BrazilChoropleth.module.css";

type StateProperties = { SIGLA: string; Estado: string };

type Metric = "order_count" | "avg_delivery_days";

const METRIC_LABEL: Record<Metric, string> = {
  order_count: "Order volume",
  avg_delivery_days: "Avg. delivery time (days)",
};

export function BrazilChoropleth() {
  const { data } = useJsonData<GeographicBreakdownRow[]>("/data/02_geographic_breakdown.json");
  // Fetched at runtime (public/geo/) rather than statically imported --
  // a static `import topoJson from "...json"` gets INLINED into the JS
  // bundle by Vite, which blew the bundle up by this file's full 256KB and
  // made the browser parse/eval it as JS before the app could even render.
  // Fetching it exactly like the other public/data/*.json files lets the
  // browser download and cache it as a separate, parallelizable request.
  const { data: topoData } = useJsonData<Topology>("/geo/br-states-topo.json");

  const statesGeoJson = useMemo(() => {
    if (!topoData) return null;
    const geometryObject = topoData.objects.br_states_raw as GeometryCollection<StateProperties>;
    return feature(topoData, geometryObject);
  }, [topoData]);
  // `ref` must land on ONE stable element that's present in every render of
  // this component -- useContainerWidth's ResizeObserver is created once,
  // on mount, and keeps watching whatever DOM node `ref.current` pointed to
  // at that moment. Earlier this ref lived on a "loading" <div> that got
  // swapped out for a differently-structured <div> once the map was ready,
  // which silently detached the observer from anything real and left
  // `width` stuck at 0 forever. Keeping the same mapWrap <div> mounted at
  // all times (only its CHILDREN change) avoids that entirely.
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const [metric, setMetric] = useState<Metric>("order_count");
  const [hovered, setHovered] = useState<{ sigla: string; x: number; y: number } | null>(null);

  const byState = useMemo(() => {
    const map = new Map<string, GeographicBreakdownRow>();
    data?.forEach((row) => map.set(row.state, row));
    return map;
  }, [data]);

  const path = useMemo(() => {
    if (width === 0 || !statesGeoJson) return null;
    const projection = geoMercator().fitWidth(width, statesGeoJson);
    return geoPath(projection);
  }, [width, statesGeoJson]);

  const bounds = useMemo(
    () => (path && statesGeoJson ? path.bounds(statesGeoJson) : null),
    [path, statesGeoJson],
  );

  // Computing a path's `d` string walks every point in that state's
  // geometry (thousands of points combined across all 27 states) -- doing
  // that inline inside the render's .map() would mean recomputing all 27
  // path strings on EVERY render, including on every pointermove while
  // hovering (which changes `hovered` state dozens of times a second).
  // Memoizing on `path` alone means this only reruns when the container is
  // resized, not on every hover-driven re-render.
  const renderedStates = useMemo(() => {
    if (!path || !statesGeoJson) return [];
    return statesGeoJson.features.map((f) => ({
      sigla: f.properties.SIGLA,
      estado: f.properties.Estado,
      d: path(f) ?? undefined,
    }));
  }, [path, statesGeoJson]);

  const colorScale = useMemo(() => {
    const values = (data ?? []).map((row) => row[metric]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    // order_count is heavily right-skewed (São Paulo dwarfs every other
    // state), so a sqrt scale keeps mid-size states visually distinguishable
    // instead of everything but SP reading as the same pale color.
    return sequentialScale([min, max], metric === "order_count" ? 0.5 : 1);
  }, [data, metric]);

  const hoveredRow = hovered ? byState.get(hovered.sigla) : undefined;
  const ready = path && bounds;

  const tableView = (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>State</th>
          <th>Orders</th>
          <th>Avg. delivery (days)</th>
        </tr>
      </thead>
      <tbody>
        {[...byState.values()]
          .sort((a, b) => b.order_count - a.order_count)
          .map((row) => (
            <tr key={row.state}>
              <td>{row.state}</td>
              <td>{formatCount(row.order_count)}</td>
              <td>{row.avg_delivery_days.toFixed(1)}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );

  return (
    <ChartCard
      title="Order volume & delivery time by state"
      subtitle="Hover a state for details. Toggle the metric mapped to color."
      tableView={tableView}
    >
      <div className={styles.toolbar}>
        <div className={styles.toggle} role="group" aria-label="Map metric">
          {(Object.keys(METRIC_LABEL) as Metric[]).map((m) => (
            <button
              key={m}
              type="button"
              className={styles.toggleButton}
              aria-pressed={metric === m}
              onClick={() => setMetric(m)}
            >
              {METRIC_LABEL[m]}
            </button>
          ))}
        </div>
        <ScaleLegend
          minLabel={metric === "order_count" ? "Fewer orders" : "Faster"}
          maxLabel={metric === "order_count" ? "More orders" : "Slower"}
          fromColor={sequentialBlue[150]}
          toColor={sequentialBlue[650]}
        />
      </div>

      <div ref={ref} className={styles.mapWrap} style={{ minHeight: ready ? undefined : 320 }}>
        {ready && bounds && (
          <>
            <svg
              viewBox={`${bounds[0][0]} ${bounds[0][1]} ${bounds[1][0] - bounds[0][0]} ${bounds[1][1] - bounds[0][1]}`}
              style={{
                width: "100%",
                aspectRatio: `${bounds[1][0] - bounds[0][0]} / ${bounds[1][1] - bounds[0][1]}`,
                display: "block",
              }}
              role="img"
              aria-label="Choropleth map of Brazil by state"
            >
              {renderedStates.map(({ sigla, estado, d }) => {
                const row = byState.get(sigla);
                const fillValue = row ? row[metric] : null;
                return (
                  <path
                    key={sigla}
                    d={d}
                    className={styles.state}
                    fill={fillValue === null ? "var(--gridline)" : colorScale(fillValue)}
                    tabIndex={0}
                    aria-label={`${estado}: ${row ? formatCount(row.order_count) + " orders" : "no data"}`}
                    onPointerMove={(e) => {
                      const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                      if (!rect) return;
                      setHovered({ sigla, x: e.clientX - rect.left, y: e.clientY - rect.top });
                    }}
                    onPointerLeave={() => setHovered(null)}
                    onFocus={(e) => {
                      const box = e.currentTarget.getBBox();
                      setHovered({ sigla, x: box.x + box.width / 2, y: box.y + box.height / 2 });
                    }}
                    onBlur={() => setHovered(null)}
                  />
                );
              })}
            </svg>

            {hovered && (
              <Tooltip
                x={hovered.x}
                y={hovered.y}
                title={hovered.sigla}
                containerWidth={width}
                rows={
                  hoveredRow
                    ? [
                        { label: "Orders", value: formatCount(hoveredRow.order_count) },
                        { label: "Avg. delivery", value: `${hoveredRow.avg_delivery_days.toFixed(1)} days` },
                      ]
                    : [{ label: "Orders", value: "No data" }]
                }
              />
            )}
          </>
        )}
      </div>

      {data && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>
          {formatCount(data.reduce((s, r) => s + r.order_count, 0))} total orders across {data.length} states
        </p>
      )}
    </ChartCard>
  );
}
