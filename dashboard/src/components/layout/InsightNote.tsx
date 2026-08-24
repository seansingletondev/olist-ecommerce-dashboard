import type { ReactNode } from "react";
import styles from "./InsightNote.module.css";

interface InsightNoteProps {
  children: ReactNode;
}

/**
 * A labeled analytical caption beneath a chart -- "what can you actually
 * learn from this" rather than a restatement of the chart's title. Reuses
 * the page header's eyebrow treatment (uppercase, small, accent-colored
 * label) at a smaller size, so this reads as the same visual language as
 * the rest of the page rather than a new pattern.
 */
export function InsightNote({ children }: InsightNoteProps) {
  return (
    <div className={styles.insight}>
      <p className={styles.label}>Insight</p>
      <p className={styles.body}>{children}</p>
    </div>
  );
}
