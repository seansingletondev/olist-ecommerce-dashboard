interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

interface TooltipProps {
  x: number;
  y: number;
  title?: string;
  rows: TooltipRow[];
  /** Width of the containing chart, used to flip the tooltip when it would overflow the right edge. */
  containerWidth?: number;
}

const TOOLTIP_WIDTH = 180;

/**
 * A floating tooltip positioned absolutely inside a `position: relative`
 * chart body. Tooltips enhance -- every value here must also be reachable
 * through a direct label or the table view, never gated behind hover.
 */
export function Tooltip({ x, y, title, rows, containerWidth }: TooltipProps) {
  const flip = containerWidth !== undefined && x + TOOLTIP_WIDTH + 16 > containerWidth;
  const left = flip ? x - TOOLTIP_WIDTH - 12 : x + 12;

  return (
    <div
      role="tooltip"
      style={{
        position: "absolute",
        left,
        top: y,
        width: TOOLTIP_WIDTH,
        pointerEvents: "none",
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        padding: "8px 10px",
        fontSize: 12,
        zIndex: 10,
      }}
    >
      {title && (
        <div style={{ color: "var(--text-secondary)", marginBottom: 4 }}>{title}</div>
      )}
      {rows.map((row) => (
        <div
          key={row.label}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
            {row.color && (
              <svg width="10" height="2" aria-hidden="true" style={{ flex: "0 0 auto" }}>
                <line x1="0" y1="1" x2="10" y2="1" stroke={row.color} strokeWidth="2" />
              </svg>
            )}
            {row.label}
          </span>
          <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>{row.value}</strong>
        </div>
      ))}
    </div>
  );
}
