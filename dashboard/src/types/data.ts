/**
 * One interface per JSON file in public/data/, matching the columns each
 * SQL query in sql/queries/ actually SELECTs. Field names/casing mirror
 * the JSON exactly (which mirrors the SQL column aliases), so there's no
 * translation layer between the database and the UI.
 */

export interface SalesTrendOverallRow {
  month: string; // ISO 8601 timestamp string, e.g. "2018-06-01T00:00:00"
  order_count: number;
  total_revenue: number;
}

export interface SalesTrendByCategoryRow {
  month: string;
  category: string;
  order_count: number;
  total_revenue: number;
}

export interface GeographicBreakdownRow {
  state: string; // 2-letter Brazilian state code, e.g. "SP"
  order_count: number;
  avg_delivery_days: number;
}

export interface DeliveryPerformanceOverallRow {
  delivered_order_count: number;
  late_count: number;
  pct_late: number;
}

export interface DeliveryPerformanceByStateRow {
  state: string;
  delivered_order_count: number;
  pct_late: number;
}

export interface DeliveryPerformanceBySellerRow {
  seller_id: string;
  delivered_order_count: number;
  pct_late: number;
}

export interface CategoryPerformanceRow {
  category: string;
  order_count: number;
  total_revenue: number;
  review_count: number;
  avg_review_score: number;
}

export interface ReviewAnalysisByDelayRow {
  delay_bucket:
    | "early_or_on_time"
    | "1_to_3_days_late"
    | "4_to_7_days_late"
    | "8_to_14_days_late"
    | "15_plus_days_late";
  review_count: number;
  avg_review_score: number;
}

export interface ReviewAnalysisByDelayAndCategoryRow {
  category: string;
  review_count: number;
  avg_score_on_time: number;
  avg_score_late: number;
}

export type RfmSegment = "champion" | "loyal" | "at_risk" | "hibernating";

export interface RfmDetailRow {
  customer_unique_id: string;
  recency_days: number;
  frequency: number;
  monetary: number;
  r_score: number;
  f_score: number;
  m_score: number;
  rfm_total: number;
  segment: RfmSegment;
}

export interface RfmSummaryRow {
  segment: RfmSegment;
  customer_count: number;
  avg_recency_days: number;
  avg_frequency: number;
  avg_monetary: number;
}

export interface RfmHeatmapRow {
  r_score: number; // 1 (least recent) - 5 (most recent)
  m_score: number; // 1 (lowest spend) - 5 (highest spend)
  customer_count: number;
}
