import { Section } from "./components/layout/Section";
import { OverviewKpis } from "./components/overview/OverviewKpis";
import { BrazilChoropleth } from "./components/charts/geography/BrazilChoropleth";
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
        <Placeholder label="Monthly revenue + category stack — built in step 6" />
      </Section>

      <Section id="delivery" title="Delivery performance" columns={2}>
        <Placeholder label="By-state bar — built in step 7" />
        <Placeholder label="Worst sellers bar — built in step 7" />
      </Section>

      <Section id="reviews" title="Reviews" columns={2}>
        <Placeholder label="Delay-bucket bar — built in step 8" />
        <Placeholder label="On-time vs. late dumbbell — built in step 8" />
      </Section>

      <Section id="categories" title="Category performance">
        <Placeholder label="Revenue vs. review bubble chart + table — built in step 9" />
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
