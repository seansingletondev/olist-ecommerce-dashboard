/**
 * Raw hex values for D3 color math (scale domains/interpolators need real
 * hex, not CSS custom properties). Mirrors src/styles/tokens.css exactly --
 * if you change one, change the other.
 */

export const categorical = {
  light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"],
  dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
};

/**
 * Sequential blue ramp (light -> dark). Used as-is in both light and dark
 * mode -- the palette reference doesn't specify separate dark-surface steps
 * for the sequential ramp (only categorical/status get explicit dark
 * variants), so this is a deliberate simplification rather than an
 * oversight.
 */
export const sequentialBlue = {
  100: "#cde2fb",
  150: "#b7d3f6",
  200: "#9ec5f4",
  250: "#86b6ef",
  300: "#6da7ec",
  350: "#5598e7",
  400: "#3987e5",
  450: "#2a78d6",
  500: "#256abf",
  550: "#1c5cab",
  600: "#184f95",
  650: "#104281",
  700: "#0d366b",
};

export const status = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
};
