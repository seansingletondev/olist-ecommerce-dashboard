import { useJsonData } from "../../lib/useJsonData";
import { formatCount, formatCurrencyCompact, formatPercent } from "../../lib/format";
import { KpiRow, StatTile } from "../layout/StatTile";
import { InsightNote } from "../layout/InsightNote";
import type {
  DeliveryPerformanceOverallRow,
  ReviewAnalysisByDelayRow,
  SalesTrendOverallRow,
} from "../../types/data";

export function OverviewKpis() {
  const sales = useJsonData<SalesTrendOverallRow[]>("/data/01_sales_trends_overall.json");
  const delivery = useJsonData<DeliveryPerformanceOverallRow[]>(
    "/data/03_delivery_performance_overall.json",
  );
  const reviews = useJsonData<ReviewAnalysisByDelayRow[]>("/data/05_review_analysis_by_delay.json");

  const loading = sales.loading || delivery.loading || reviews.loading;
  if (loading || !sales.data || !delivery.data || !reviews.data) {
    return (
      <KpiRow>
        <StatTile label="Total revenue" value="…" />
        <StatTile label="Total orders" value="…" />
        <StatTile label="Late deliveries" value="…" />
        <StatTile label="Avg. review score" value="…" />
      </KpiRow>
    );
  }

  const totalRevenue = sales.data.reduce((sum, row) => sum + row.total_revenue, 0);
  const totalOrders = sales.data.reduce((sum, row) => sum + row.order_count, 0);

  const pctLate = delivery.data[0]?.pct_late ?? 0;

  const reviewWeightedSum = reviews.data.reduce(
    (sum, row) => sum + row.avg_review_score * row.review_count,
    0,
  );
  const reviewCount = reviews.data.reduce((sum, row) => sum + row.review_count, 0);
  const avgReviewScore = reviewCount > 0 ? reviewWeightedSum / reviewCount : 0;

  return (
    <>
      <KpiRow>
        <StatTile label="Total revenue" value={formatCurrencyCompact(totalRevenue)} />
        <StatTile label="Total orders" value={formatCount(totalOrders)} />
        <StatTile label="Late deliveries" value={formatPercent(pctLate)} />
        <StatTile label="Avg. review score" value={`${avgReviewScore.toFixed(2)} / 5`} />
      </KpiRow>
      <InsightNote>
        R$13.5M in revenue across roughly 98K orders between September 2016 and September 2018
        (the export cuts off mid-month) works out to about R$137 per order. The 8.1% late-delivery
        rate is the share of orders that arrived after the date Olist promised the customer, and
        4.15/5 is the average star rating customers left afterward — both suggest the overall
        experience is solid, but the sections below show that average hides sharp differences by
        state, seller, and how late a delivery actually was.
      </InsightNote>
    </>
  );
}
