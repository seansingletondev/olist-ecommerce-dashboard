import type { ReactNode } from "react";
import styles from "./StatTile.module.css";

interface StatTileProps {
  label: string;
  value: string;
}

/** A single current value with no trend -- a stat tile, per the dataviz skill, not a one-bar bar chart. */
export function StatTile({ label, value }: StatTileProps) {
  return (
    <div className={styles.tile}>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value}</p>
    </div>
  );
}

export function KpiRow({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>;
}
