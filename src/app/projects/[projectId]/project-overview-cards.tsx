import Link from "next/link";

import styles from "../../page.module.css";
import { SERVICE_COLORS, SERVICE_ICONS, type ProjectServiceId } from "./service-config";

const OVERVIEW_SERVICES: Array<{ id: ProjectServiceId; name: string; description: string }> = [
  { id: "auth", name: "Authentication", description: "Manage users, sessions, and providers" },
  { id: "database", name: "Database", description: "Explore schema and table relationships" },
  { id: "api", name: "API", description: "Manage keys and integration snippets" },
  { id: "analytics", name: "Analytics", description: "Observe traffic, latency, and errors" },
  { id: "storage", name: "Storage", description: "Buckets, uploads, and assets" },
];

export function ProjectOverviewCards({ projectId }: { projectId: string }) {
  return (
    <section className={styles.overviewCompactSection}>
      <div className={styles.overviewCompactHeader}>
        <h3 className={styles.serviceSectionTitle}>Project Overview</h3>
        <p className={styles.overviewCompactSub}>Quick navigation to core services.</p>
      </div>
      <ul className={styles.overviewCompactGrid}>
        {OVERVIEW_SERVICES.map((service) => (
          <li key={service.id}>
            <Link
              href={`/projects/${projectId}/${service.id}`}
              className={styles.overviewCompactCard}
              style={{ "--service-color": SERVICE_COLORS[service.id] } as React.CSSProperties}
            >
              <span className={styles.overviewCompactIcon}>{SERVICE_ICONS[service.id]}</span>
              <div className={styles.overviewCompactBody}>
                <h4 className={styles.overviewCompactName}>{service.name}</h4>
                <p className={styles.overviewCompactDesc}>{service.description}</p>
              </div>
              <span className={styles.overviewCompactCta}>Open</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
