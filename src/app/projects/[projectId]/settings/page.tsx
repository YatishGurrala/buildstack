"use client";

import Link from "next/link";
import { use } from "react";

import styles from "../../../page.module.css";

export default function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);


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
          <Link href={`/projects/${projectId}`} className={styles.sidebarNavItem}>
            Overview
          </Link>
          <Link href={`/projects/${projectId}/database`} className={styles.sidebarNavItem}>
            Database
          </Link>
          <Link href={`/projects/${projectId}/auth`} className={styles.sidebarNavItem}>
            Authentication
          </Link>
          <Link href={`/projects/${projectId}/api`} className={styles.sidebarNavItem}>
            API
          </Link>
          <Link href={`/projects/${projectId}/storage`} className={styles.sidebarNavItem}>
            Storage
          </Link>
          <Link href={`/projects/${projectId}/sql`} className={styles.sidebarNavItem}>
            SQL Editor
          </Link>
          <Link href={`/projects/${projectId}/settings`} className={`${styles.sidebarNavItem} ${styles.sidebarNavItemActive}`}>
            Settings
          </Link>
        </nav>
      </aside>

      <div className={styles.consoleMain}>
        <header className={styles.consoleTopbar}>
          <p className={styles.topbarPath}>Projects &gt; {projectId} &gt; settings</p>
          <Link href={`/projects/${projectId}`} className={styles.secondaryButtonLink}>
            Back to services
          </Link>
        </header>

        <main className={styles.consoleContent}>
          <div className={styles.dashHeader}>
            <div>
              <h1 className={styles.dashTitle}>Project Settings</h1>
              <p className={styles.dashSub}>Core project metadata and membership context for this workspace.</p>
            </div>
          </div>

          <section className={styles.serviceConsole}>
            <div className={styles.serviceSection}>
              <h3 className={styles.serviceSectionTitle}>General</h3>
              <div className={styles.serviceMetaGrid}>
                <div className={styles.serviceMetaCard}>
                  <p className={styles.serviceMetaLabel}>Project ID</p>
                  <p className={styles.serviceMetaValue}>{projectId}</p>
                </div>
                <div className={styles.serviceMetaCard}>
                  <p className={styles.serviceMetaLabel}>Scope</p>
                  <p className={styles.serviceMetaValue}>Frozen core metadata only</p>
                </div>
                <div className={styles.serviceMetaCard}>
                  <p className={styles.serviceMetaLabel}>Out of Scope</p>
                  <p className={styles.serviceMetaValue}>Billing, storage engines, and product modules</p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
