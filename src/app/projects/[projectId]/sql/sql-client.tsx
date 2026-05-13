"use client";

import { useState } from "react";

import styles from "../../../page.module.css";

type QueryTemplate = {
  id: string;
  name: string;
  sql: string;
  columns: Array<{ label: string; value: string }>;
  rows: Array<Array<string>>;
};

const QUERY_TEMPLATES: QueryTemplate[] = [
  {
    id: "active-users",
    name: "fetch_active_users.sql",
    sql: `SELECT
  u.id AS user_id,
  u.email,
  COUNT(o.id) AS total_orders,
  SUM(o.amount) AS lifetime_value
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.status = 'active'
GROUP BY u.id, u.email
ORDER BY lifetime_value DESC
LIMIT 100;`,
    columns: [
      { label: "User ID", value: "usr_92817a" },
      { label: "Email", value: "alex.chen@nexus.dev" },
      { label: "Total Orders", value: "42" },
      { label: "Lifetime Value", value: "$12,490.00" },
    ],
    rows: [
      ["usr_92817a", "alex.chen@nexus.dev", "42", "$12,490.00"],
      ["usr_10293b", "sarah.j@buildstack.io", "38", "$9,120.50"],
      ["usr_55621f", "m.rossi@quantum.co", "15", "$4,300.00"],
    ],
  },
  {
    id: "revenue-metrics",
    name: "revenue_metrics.sql",
    sql: `SELECT
  DATE_TRUNC('day', created_at) AS day,
  COUNT(*) AS orders,
  SUM(amount) AS revenue
FROM orders
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1 DESC;`,
    columns: [
      { label: "Day", value: "2026-05-08" },
      { label: "Orders", value: "124" },
      { label: "Revenue", value: "$18,400.00" },
    ],
    rows: [
      ["2026-05-08", "124", "$18,400.00"],
      ["2026-05-07", "97", "$14,860.00"],
      ["2026-05-06", "88", "$12,420.00"],
    ],
  },
];

export function SqlClient({ projectId: _projectId }: { projectId: string }) {
  const [selectedQueryId, setSelectedQueryId] = useState(QUERY_TEMPLATES[0].id);
  const selectedQuery = QUERY_TEMPLATES.find((query) => query.id === selectedQueryId) ?? QUERY_TEMPLATES[0];

  return (
    <section className={styles.serviceConsole}>
      <div className={styles.serviceDetailSplit}>
        <div className={styles.serviceDetailNav}>
          {QUERY_TEMPLATES.map((query) => (
            <button
              key={query.id}
              type="button"
              className={`${styles.serviceDetailNavButton} ${selectedQueryId === query.id ? styles.serviceDetailNavButtonActive : ""}`}
              onClick={() => setSelectedQueryId(query.id)}
              aria-pressed={selectedQueryId === query.id}
            >
              {query.name}
            </button>
          ))}
        </div>

        <div className={styles.serviceDetailPanel}>
          <div className={styles.sqlHeader}>
            <div>
              <h3 className={styles.serviceSectionTitle}>{selectedQuery.name}</h3>
              <p className={styles.projectCardDate}>Run query, inspect schema, and review compact results.</p>
            </div>
            <button type="button" className={styles.primaryButton}>Run Query</button>
          </div>

          <pre className={styles.sqlEditor}>{selectedQuery.sql}</pre>

          <div className={styles.sqlResults}>
            <p className={styles.serviceSectionTitle}>Result Snapshot</p>
            <div className={styles.serviceMetaGrid}>
              {selectedQuery.columns.map((column) => (
                <div key={column.label} className={styles.serviceMetaCard}>
                  <p className={styles.serviceMetaLabel}>{column.label}</p>
                  <p className={styles.serviceMetaValue}>{column.value}</p>
                </div>
              ))}
            </div>

            <div className={styles.storageTable}>
              <div className={styles.storageRowHead}>
                {selectedQuery.columns.map((column) => (
                  <span key={column.label}>{column.label}</span>
                ))}
              </div>
              {selectedQuery.rows.map((row, index) => (
                <div key={`${selectedQuery.id}-${index}`} className={styles.storageRow}>
                  {row.map((value) => (
                    <span key={value}>{value}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
