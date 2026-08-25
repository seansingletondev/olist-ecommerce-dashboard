import { useMemo, useState } from "react";
import { useJsonData } from "../../../lib/useJsonData";
import { formatCategoryLabel, formatCount, formatCurrencyCompact } from "../../../lib/format";
import type { CategoryPerformanceRow } from "../../../types/data";
import { ChartCard } from "../../layout/ChartCard";
import styles from "./CategoryTable.module.css";

type SortKey = keyof Pick<
  CategoryPerformanceRow,
  "category" | "order_count" | "total_revenue" | "review_count" | "avg_review_score"
>;

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "category", label: "Category" },
  { key: "order_count", label: "Orders" },
  { key: "total_revenue", label: "Revenue" },
  { key: "review_count", label: "Reviews" },
  { key: "avg_review_score", label: "Avg. score" },
];

/** The full-detail table equivalent of the bubble chart above -- the ">~7 categories that all carry meaning" case from the dataviz skill calls for a table, not more chart. */
export function CategoryTable() {
  const { data } = useJsonData<CategoryPerformanceRow[]>("/data/04_category_performance.json");
  const [sortKey, setSortKey] = useState<SortKey>("total_revenue");
  const [sortDesc, setSortDesc] = useState(true);

  const sorted = useMemo(() => {
    if (!data) return [];
    const rows = [...data];
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDesc ? -cmp : cmp;
    });
    return rows;
  }, [data, sortKey, sortDesc]);

  if (!data) {
    return (
      <ChartCard title="All categories">
        <div style={{ minHeight: 200 }} />
      </ChartCard>
    );
  }

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDesc((d) => !d);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  return (
    <ChartCard
      title="All categories"
      subtitle={`${data.length} product categories, click a column to sort`}
      insight={
        <>
          Beyond the top 25 shown in the bubble chart above, the long tail of niche categories
          still holds real signal. Several of the highest average review scores in the entire
          dataset actually belong to small, low-volume categories like <code>cds_dvds_musicals</code>{" "}
          and <code>flowers</code>, not the big sellers.
        </>
      }
    >
      <div className={styles.scrollWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.key}>
                  <button type="button" className={styles.th} onClick={() => toggleSort(col.key)}>
                    {col.label}
                    {sortKey === col.key ? (sortDesc ? " ↓" : " ↑") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.category}>
                <td>{formatCategoryLabel(row.category)}</td>
                <td>{formatCount(row.order_count)}</td>
                <td>{formatCurrencyCompact(row.total_revenue)}</td>
                <td>{formatCount(row.review_count)}</td>
                <td>{row.avg_review_score.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
