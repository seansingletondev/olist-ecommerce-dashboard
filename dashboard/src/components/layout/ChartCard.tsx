import { useState, type ReactNode } from "react";
import { InsightNote } from "./InsightNote";
import styles from "./ChartCard.module.css";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  /** The chart itself. */
  children: ReactNode;
  /**
   * The WCAG-clean table equivalent of the chart. When provided, a
   * "View as table" toggle appears in the header — every chart that isn't
   * a bare stat tile should supply one (dataviz skill accessibility rule).
   */
  tableView?: ReactNode;
  /** "What can you learn from this" -- rendered as a labeled InsightNote below the chart. */
  insight?: ReactNode;
  footnote?: string;
}

export function ChartCard({ title, subtitle, children, tableView, insight, footnote }: ChartCardProps) {
  const [showTable, setShowTable] = useState(false);

  return (
    <figure className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <p className={styles.title}>{title}</p>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {tableView && (
          <button
            type="button"
            className={styles.tableToggle}
            aria-pressed={showTable}
            onClick={() => setShowTable((v) => !v)}
          >
            {showTable ? "View chart" : "View as table"}
          </button>
        )}
      </div>
      <div className={styles.body}>{showTable && tableView ? tableView : children}</div>
      {insight && <InsightNote>{insight}</InsightNote>}
      {footnote && <figcaption className={styles.footnote}>{footnote}</figcaption>}
    </figure>
  );
}
