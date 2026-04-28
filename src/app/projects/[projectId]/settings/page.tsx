import Link from "next/link";

import styles from "../../../page.module.css";

export default async function ProjectSettingsPage({
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
            <p className={styles.sidebarMeta}>Project Settings</p>
          </div>
        </div>
        <nav className={styles.sidebarNav}>
          <Link href={`/projects/${projectId}`} className={styles.sidebarNavItem}>Overview</Link>
          <Link href={`/projects/${projectId}/database`} className={styles.sidebarNavItem}>Database</Link>
          <Link href={`/projects/${projectId}/auth`} className={styles.sidebarNavItem}>Authentication</Link>
          <Link href={`/projects/${projectId}/api`} className={styles.sidebarNavItem}>API</Link>
          <Link href={`/projects/${projectId}/storage`} className={styles.sidebarNavItem}>Storage</Link>
          <Link href={`/projects/${projectId}/sql`} className={styles.sidebarNavItem}>SQL Editor</Link>
          <Link href={`/projects/${projectId}/settings`} className={`${styles.sidebarNavItem} ${styles.sidebarNavItemActive}`}>Settings</Link>
        </nav>
      </aside>

      <div className={styles.consoleMain}>
        <header className={styles.consoleTopbar}>
          <p className={styles.topbarPath}>Projects &gt; {projectId} &gt; settings</p>
          <Link href={`/projects/${projectId}`} className={styles.secondaryButtonLink}>Back to services</Link>
        </header>

        <main className={styles.consoleContent}>
          <div className={styles.dashHeader}>
            <div>
              <h1 className={styles.dashTitle}>Project Settings</h1>
              <p className={styles.dashSub}>Manage configuration, environment variables, and destructive actions.</p>
            </div>
          </div>

          <section className={styles.serviceConsole}>
            <div className={styles.serviceSection}>
              <h3 className={styles.serviceSectionTitle}>General Settings</h3>
              <div className={styles.serviceMetaGrid}>
                <div className={styles.serviceMetaCard}>
                  <p className={styles.serviceMetaLabel}>Project Name</p>
                  <p className={styles.serviceMetaValue}>Buildstack Production</p>
                </div>
                <div className={styles.serviceMetaCard}>
                  <p className={styles.serviceMetaLabel}>Project ID</p>
                  <p className={styles.serviceMetaValue}>{projectId}</p>
                </div>
              </div>
            </div>

            <div className={styles.serviceSection}>
              <h3 className={styles.serviceSectionTitle}>Environment Variables</h3>
              <div className={styles.apiKeyList}>
                <div className={styles.apiKeyItem}>
                  <div>
                    <p className={styles.createFormTitle}>DATABASE_URL</p>
                    <p className={styles.projectCardDate}>Production scope</p>
                  </div>
                  <button type="button" className={styles.serviceActionButton}>Edit</button>
                </div>
                <div className={styles.apiKeyItem}>
                  <div>
                    <p className={styles.createFormTitle}>STRIPE_SECRET_KEY</p>
                    <p className={styles.projectCardDate}>All environments</p>
                  </div>
                  <button type="button" className={styles.serviceActionButton}>Edit</button>
                </div>
              </div>
            </div>

            <div className={styles.serviceSection}>
              <h3 className={styles.serviceSectionTitle}>Danger Zone</h3>
              <div className={styles.dangerPanel}>
                <div className={styles.dangerRow}>
                  <div>
                    <p className={styles.createFormTitle}>Pause Project</p>
                    <p className={styles.projectCardDate}>Stop all active functions and services.</p>
                  </div>
                  <button type="button" className={styles.dangerButton}>Pause</button>
                </div>
                <div className={styles.dangerRow}>
                  <div>
                    <p className={styles.createFormTitle}>Delete Project</p>
                    <p className={styles.projectCardDate}>Permanently remove this project and its data.</p>
                  </div>
                  <button type="button" className={styles.dangerButton}>Delete</button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
