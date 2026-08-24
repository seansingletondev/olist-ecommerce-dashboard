import type { ReactNode } from "react";
import styles from "./Section.module.css";

interface SectionProps {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  /** Grid columns at desktop width; stacks to 1 column on narrow screens via CSS clamp below. */
  columns?: number;
}

export function Section({ id, title, description, children, columns = 1 }: SectionProps) {
  return (
    <section id={id} className={styles.section}>
      <h2 className={styles.heading}>{title}</h2>
      {description && <p className={styles.description}>{description}</p>}
      <div
        className={styles.grid}
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${Math.floor(1000 / columns)}px), 1fr))`,
        }}
      >
        {children}
      </div>
    </section>
  );
}
