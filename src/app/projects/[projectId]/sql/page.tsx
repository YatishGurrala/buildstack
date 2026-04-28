import Link from "next/link";

import styles from "../../../page.module.css";

export default async function ProjectSqlPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <div className={styles.consoleShell}>
      <aside className={styles.consoleSidebar}>
        <div className={styles.sidebarBrand}>
          <span className={styles.logoMark}>B</span>
          <div>
            <p className={styles.logoText}>Buildstack</p>
            <p className={styles.sidebarMeta}>SQL Workspace</p>
          </div>
        </div>
        <nav className={styles.sidebarNav}>
          <Link href={`/projects/${projectId}`} className={styles.sidebarNavItem}>Overview</Link>
          <Link href={`/projects/${projectId}/database`} className={styles.sidebarNavItem}>Database</Link>
          <Link href={`/projects/${projectId}/auth`} className={styles.sidebarNavItem}>Authentication</Link>
          <Link href={`/projects/${projectId}/api`} className={styles.sidebarNavItem}>API</Link>
          <Link href={`/projects/${projectId}/storage`} className={styles.sidebarNavItem}>Storage</Link>
          <Link href={`/projects/${projectId}/sql`} className={`${styles.sidebarNavItem} ${styles.sidebarNavItemActive}`}>SQL Editor</Link>
          <Link href={`/projects/${projectId}/settings`} className={styles.sidebarNavItem}>Settings</Link>
        </nav>
      </aside>

      <div className={styles.consoleMain}>
        <header className={styles.consoleTopbar}>
          <p className={styles.topbarPath}>Projects &gt; {projectId} &gt; sql</p>
          <Link href={`/projects/${projectId}`} className={styles.secondaryButtonLink}>Back to services</Link>
        </header>

        <main className={styles.consoleContent}>
          <div className={styles.dashHeader}>
            <div>
              <h1 className={styles.dashTitle}>SQL Editor</h1>
              <p className={styles.dashSub}>Run queries, inspect schema, and review query results.</p>
            </div>
          </div>

          <section className={styles.serviceConsole}>
            <div className={styles.sqlHeader}>
              <div className={styles.sqlTabs}>
                <span className={`${styles.sqlTab} ${styles.sqlTabActive}`}>fetch_active_users.sql</span>
                <span className={styles.sqlTab}>revenue_metrics.sql</span>
              </div>
              <button type="button" className={styles.primaryButton}>Run Query</button>
            </div>

            <pre className={styles.sqlEditor}>{`SELECT
  u.id AS user_id,
  u.email,
  COUNT(o.id) AS total_orders,
  SUM(o.amount) AS lifetime_value
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.status = 'active'
GROUP BY u.id, u.email
ORDER BY lifetime_value DESC
LIMIT 100;`}</pre>

            <div className={styles.sqlResults}>
              <p className={styles.serviceSectionTitle}>Query Results</p>
              <div className={styles.storageTable}>
                <div className={styles.storageRowHead}><span>User ID</span><span>Email</span><span>Total Orders</span><span>Lifetime Value</span></div>
                <div className={styles.storageRow}><span>usr_92817a</span><span>alex.chen@nexus.dev</span><span>42</span><span>$12,490.00</span></div>
                <div className={styles.storageRow}><span>usr_10293b</span><span>sarah.j@buildstack.io</span><span>38</span><span>$9,120.50</span></div>
                <div className={styles.storageRow}><span>usr_55621f</span><span>m.rossi@quantum.co</span><span>15</span><span>$4,300.00</span></div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
