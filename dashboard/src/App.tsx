import { Section } from "./components/layout/Section";
import { OverviewKpis } from "./components/overview/OverviewKpis";
import { BrazilChoropleth } from "./components/charts/geography/BrazilChoropleth";
import { SalesTrendLine } from "./components/charts/sales/SalesTrendLine";
import { CategoryRevenueStack } from "./components/charts/sales/CategoryRevenueStack";
import { DeliveryStateBar } from "./components/charts/delivery/DeliveryStateBar";
import { DeliverySellerBar } from "./components/charts/delivery/DeliverySellerBar";
import { ReviewDelayBar } from "./components/charts/reviews/ReviewDelayBar";
import { ReviewDumbbell } from "./components/charts/reviews/ReviewDumbbell";
import { CategoryBubble } from "./components/charts/categories/CategoryBubble";
import { CategoryTable } from "./components/charts/categories/CategoryTable";
import styles from "./App.module.css";

function Placeholder({ label }: { label: string }) {
  return (
    <div
      style={{
        border: "1px dashed var(--border)",
        borderRadius: 12,
        padding: 40,
        textAlign: "center",
        color: "var(--text-muted)",
        fontSize: 13,
      }}
    >
      {label}
    </div>
  );
}

function App() {
  return (
    <>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Brazilian E-Commerce Analytics</p>
        <h1 className={styles.title}>Olist Order &amp; Customer Dashboard</h1>
        <p className={styles.lede}>
          A look at ~99k orders on the Olist marketplace (2016-2018): sales trends, delivery
          performance, product category performance, review sentiment, and RFM customer
          segmentation — built on a Postgres → SQL → Python → D3 pipeline.
        </p>
      </header>

      <Section id="overview" title="Overview">
        <OverviewKpis />
      </Section>

      <Section id="geography" title="Geography">
        <BrazilChoropleth />
      </Section>

      <Section id="sales" title="Sales trends">
        <SalesTrendLine />
        <CategoryRevenueStack />
      </Section>

      <Section id="delivery" title="Delivery performance" columns={2}>
        <DeliveryStateBar />
        <DeliverySellerBar />
      </Section>

      <Section id="reviews" title="Reviews" columns={2}>
        <ReviewDelayBar />
        <ReviewDumbbell />
      </Section>

      <Section id="categories" title="Category performance">
        <CategoryBubble />
        <CategoryTable />
      </Section>

      <Section id="customers" title="Customer segmentation (RFM)" columns={2}>
        <Placeholder label="Segment share + metric bars — built in step 10" />
        <Placeholder label="Recency × monetary heatmap — built in step 10" />
      </Section>

      <footer className={styles.footer}>
        <p>
          Data: Olist Brazilian E-Commerce Public Dataset (Kaggle). Pipeline: PostgreSQL
          (Neon) → SQL analysis queries → Python export → this dashboard.
        </p>
      </footer>
    </>
  );
}

export default App;
