import Link from "next/link";

import styles from "../../../page.module.css";
import { StorageClient } from "./storage-client";

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
              <p className={styles.dashSub}>Choose a bucket on the left and inspect the file list and details on the right.</p>
            </div>
          </div>

          <StorageClient projectId={projectId} />
        </main>
      </div>
    </div>
  );
}
