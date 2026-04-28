import Link from "next/link";

import styles from "../../../page.module.css";
import { ProjectOverviewCards } from "../project-overview-cards";

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
              <p className={styles.dashSub}>Browse buckets, inspect files, and manage uploads.</p>
            </div>
          </div>

          <ProjectOverviewCards projectId={projectId} />

          <div className={styles.storageLayout}>
            <section className={styles.serviceConsole}>
              <h3 className={styles.serviceSectionTitle}>Buckets</h3>
              <div className={styles.bucketList}>
                <button type="button" className={styles.bucketItem}>avatars</button>
                <button type="button" className={`${styles.bucketItem} ${styles.bucketItemActive}`}>product-images</button>
                <button type="button" className={styles.bucketItem}>logs-archive</button>
                <button type="button" className={styles.bucketItem}>user-uploads</button>
              </div>
            </section>

            <section className={styles.serviceConsole}>
              <div className={styles.storageHeader}>
                <h3 className={styles.serviceSectionTitle}>product-images</h3>
                <div className={styles.storageHeaderActions}>
                  <button type="button" className={styles.serviceActionButton}>New Folder</button>
                  <button type="button" className={styles.primaryButton}>Upload File</button>
                </div>
              </div>
              <div className={styles.storageTable}>
                <div className={styles.storageRowHead}><span>Name</span><span>Type</span><span>Size</span><span>Last Modified</span></div>
                <div className={styles.storageRow}><span>watch-hero-01.webp</span><span>image/webp</span><span>1.2 MB</span><span>2 minutes ago</span></div>
                <div className={styles.storageRow}><span>metadata-schema.json</span><span>application/json</span><span>42 KB</span><span>1 hour ago</span></div>
                <div className={styles.storageRow}><span>launch-campaign.mp4</span><span>video/mp4</span><span>145.2 MB</span><span>Yesterday</span></div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
