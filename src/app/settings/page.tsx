"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import styles from "../page.module.css";

type Me = {
  id: string;
  email: string;
  name?: string;
};

export default function AccountSettingsPage() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/core/auth/me")
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/";
        }

        return r.json();
      })
      .then((payload) => {
        if (payload?.data) {
          setMe(payload.data);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className={styles.consoleShell}>
      <aside className={styles.consoleSidebar}>
        <div className={styles.sidebarBrand}>
          <span className={styles.logoMark}>B</span>
          <div>
            <p className={styles.logoText}>Buildstack</p>
            <p className={styles.sidebarMeta}>Account Settings</p>
          </div>
        </div>
        <nav className={styles.sidebarNav}>
          <Link href="/" className={styles.sidebarNavItem}>Projects</Link>
          <Link href="/docs/connect-app" className={styles.sidebarNavItem}>Documentation</Link>
          <a href="mailto:support@builddeck.io" className={styles.sidebarNavItem}>Support</a>
          <Link href="/settings" className={`${styles.sidebarNavItem} ${styles.sidebarNavItemActive}`}>Settings</Link>
        </nav>
        <div className={styles.sidebarFooter}>{me?.email ?? "—"}</div>
      </aside>

      <div className={styles.consoleMain}>
        <header className={styles.consoleTopbar}>
          <p className={styles.topbarPath}>Dashboard / Settings</p>
          <Link href="/" className={styles.secondaryButtonLink}>Back to projects</Link>
        </header>

        <main className={styles.consoleContent}>
          <div className={styles.dashHeader}>
            <div>
              <h1 className={styles.dashTitle}>Account Settings</h1>
              <p className={styles.dashSub}>Manage your profile and account preferences.</p>
            </div>
          </div>

          <section className={styles.serviceConsole}>
            {/* Profile */}
            <div className={styles.serviceSection}>
              <h3 className={styles.serviceSectionTitle}>Profile</h3>
              <div className={styles.serviceMetaGrid}>
                <div className={styles.serviceMetaCard}>
                  <p className={styles.serviceMetaLabel}>Email</p>
                  <p className={styles.serviceMetaValue}>{me?.email ?? "—"}</p>
                </div>
                <div className={styles.serviceMetaCard}>
                  <p className={styles.serviceMetaLabel}>Name</p>
                  <p className={styles.serviceMetaValue}>{me?.name ?? "—"}</p>
                </div>
                <div className={styles.serviceMetaCard}>
                  <p className={styles.serviceMetaLabel}>Account ID</p>
                  <p className={styles.serviceMetaValue}>{me?.id ?? "—"}</p>
                </div>
                <div className={styles.serviceMetaCard}>
                  <p className={styles.serviceMetaLabel}>Auth Provider</p>
                  <p className={styles.serviceMetaValue}>Google SSO</p>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className={styles.serviceSection}>
              <h3 className={styles.serviceSectionTitle}>Preferences</h3>
              <div className={styles.apiKeyList}>
                <div className={styles.apiKeyItem}>
                  <div>
                    <p className={styles.createFormTitle}>Theme</p>
                    <p className={styles.projectCardDate}>Dark (default)</p>
                  </div>
                  <span className={styles.serviceMetaLabel}>System default</span>
                </div>
                <div className={styles.apiKeyItem}>
                  <div>
                    <p className={styles.createFormTitle}>Timezone</p>
                    <p className={styles.projectCardDate}>Detected from browser</p>
                  </div>
                  <span className={styles.serviceMetaLabel}>Auto</span>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className={styles.serviceSection}>
              <h3 className={styles.serviceSectionTitle}>Danger Zone</h3>
              <div className={styles.dangerPanel}>
                <div className={styles.dangerRow}>
                  <div>
                    <p className={styles.createFormTitle}>Sign Out</p>
                    <p className={styles.projectCardDate}>End your current session.</p>
                  </div>
                  <button
                    type="button"
                    className={styles.dangerButton}
                    onClick={async () => {
                      await fetch("/api/core/auth/logout", { method: "POST" });
                      window.location.href = "/";
                    }}
                  >
                    Sign out
                  </button>
                </div>
                <div className={styles.dangerRow}>
                  <div>
                    <p className={styles.createFormTitle}>Delete Account</p>
                    <p className={styles.projectCardDate}>Permanently remove your account and all associated projects.</p>
                  </div>
                  <button type="button" className={styles.dangerButton} disabled title="Contact support to delete your account">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
