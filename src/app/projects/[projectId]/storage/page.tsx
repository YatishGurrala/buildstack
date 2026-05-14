import Link from "next/link";

import styles from "../../../page.module.css";

export default async function ProjectStoragePage({
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
            <p className={styles.sidebarMeta}>Object Storage</p>
          </div>
        </div>
        <nav className={styles.sidebarNav}>
          <Link href={`/projects/${projectId}`} className={styles.sidebarNavItem}>Overview</Link>
          <Link href={`/projects/${projectId}/database`} className={styles.sidebarNavItem}>Database</Link>
          <Link href={`/projects/${projectId}/auth`} className={styles.sidebarNavItem}>Authentication</Link>
          <Link href={`/projects/${projectId}/api`} className={styles.sidebarNavItem}>API</Link>
          <Link href={`/projects/${projectId}/storage`} className={`${styles.sidebarNavItem} ${styles.sidebarNavItemActive}`}>Storage</Link>
          <Link href={`/projects/${projectId}/sql`} className={styles.sidebarNavItem}>SQL Editor</Link>
          <Link href={`/projects/${projectId}/settings`} className={styles.sidebarNavItem}>Settings</Link>
        </nav>
      </aside>

      <div className={styles.consoleMain}>
        <header className={styles.consoleTopbar}>
          <p className={styles.topbarPath}>Projects &gt; {projectId} &gt; storage</p>
          <Link href={`/projects/${projectId}`} className={styles.secondaryButtonLink}>Back to services</Link>
        </header>

        <main className={styles.consoleContent}>
          <div className={styles.dashHeader}>
            <div>
              <h1 className={styles.dashTitle}>Storage Explorer</h1>
              <p className={styles.dashSub}>Storage engines are out of frozen core scope. This page remains as a placeholder only.</p>
            </div>
          </div>

          <section className={styles.serviceConsole}>
            <div className={styles.serviceSection}>
              <h3 className={styles.serviceSectionTitle}>Not In Frozen Core</h3>
              <p className={styles.projectCardDate}>
                Buildstack Core does not implement storage buckets, uploads, or file serving.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
