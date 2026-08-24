import { categorical } from "./palette";
import type { RfmSegment } from "../types/data";

/** Fixed order/color for every RFM chart in the Customers section, so a segment means the same color everywhere it appears. */
export const SEGMENT_ORDER: RfmSegment[] = ["champion", "loyal", "at_risk", "hibernating"];

export const SEGMENT_LABEL: Record<RfmSegment, string> = {
  champion: "Champion",
  loyal: "Loyal",
  at_risk: "At risk",
  hibernating: "Hibernating",
};

export const SEGMENT_COLOR: Record<RfmSegment, string> = {
  champion: categorical.light[0],
  loyal: categorical.light[1],
  at_risk: categorical.light[2],
  hibernating: categorical.light[3],
};
