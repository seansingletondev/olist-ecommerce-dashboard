interface LegendItem {
  label: string;
  color: string;
  shape?: "rect" | "line";
}

interface LegendProps {
  items: LegendItem[];
}

/**
 * A legend is always present for two or more series (the dependable
 * identity channel -- color-matching alone is never enough). A single
 * series needs no legend box; callers simply don't render one.
 */
export function Legend({ items }: LegendProps) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "14px",
        marginBottom: "10px",
      }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-secondary)" }}
        >
          {item.shape === "line" ? (
            <svg width="14" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="14" y2="4" stroke={item.color} strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="10" height="10" aria-hidden="true">
              <rect width="10" height="10" rx="2" fill={item.color} />
            </svg>
          )}
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
