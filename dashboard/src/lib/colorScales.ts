import { interpolateRgb } from "d3";
import { sequentialBlue } from "./palette";

/**
 * A sequential (one-hue, light -> dark) scale for continuous magnitude
 * data -- choropleths, heatmaps. `power < 1` compresses a long right tail
 * (a few very large values, many small ones) so the map/grid doesn't end
 * up mostly the lightest step with one dramatic outlier.
 *
 * Written as a plain function (rather than chaining d3's
 * scaleSequentialPow().exponent(...)) because @types/d3-scale doesn't
 * expose `.exponent()` on the sequential scale types, even though it
 * exists at runtime -- normalizing by hand sidesteps the type gap
 * entirely and is simple enough not to need the scale object anyway.
 */
export function sequentialScale(domain: [number, number], power = 1) {
  const [min, max] = domain;
  const interpolator = interpolateRgb(sequentialBlue[150], sequentialBlue[650]);

  return (value: number): string => {
    const t = max === min ? 0 : (value - min) / (max - min);
    const clamped = Math.max(0, Math.min(1, t));
    return interpolator(power === 1 ? clamped : Math.pow(clamped, power));
  };
}
