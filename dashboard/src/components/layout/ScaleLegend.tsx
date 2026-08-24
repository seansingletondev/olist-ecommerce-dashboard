interface ScaleLegendProps {
  minLabel: string;
  maxLabel: string;
  fromColor: string;
  toColor: string;
}

/** The legend for a sequential (magnitude) color scale -- a gradient bar with endpoint labels, not swatches. */
export function ScaleLegend({ minLabel, maxLabel, fromColor, toColor }: ScaleLegendProps) {
  const gradientId = `scale-legend-${fromColor.replace("#", "")}-${toColor.replace("#", "")}`;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)" }}>
      <span>{minLabel}</span>
      <svg width="100" height="10" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={fromColor} />
            <stop offset="100%" stopColor={toColor} />
          </linearGradient>
        </defs>
        <rect width="100" height="10" rx="3" fill={`url(#${gradientId})`} />
      </svg>
      <span>{maxLabel}</span>
    </div>
  );
}
