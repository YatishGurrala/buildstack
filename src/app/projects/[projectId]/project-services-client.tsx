"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import styles from "../../page.module.css";

type Service = {
  id: string;
  name: string;
  description: string;
  status: "available" | "coming-soon";
};

const SERVICE_ICONS: Record<string, string> = {
  auth: "🔐",
  database: "🗄️",
  api: "⚡",
  analytics: "📊",
};

const SERVICE_COLORS: Record<string, string> = {
  auth: "#3b82f6",
  database: "#10b981",
  api: "#f59e0b",
  analytics: "#8b5cf6",
};

const SERVICE_ACTIONS: Record<string, string[]> = {
  auth: ["Manage providers", "View users", "Configure JWT"],
  database: ["Open SQL editor", "View tables", "Run migration"],
  api: ["Browse API endpoints", "Generate API key", "View request logs"],
  analytics: ["Open dashboard", "Filter by route", "Export metrics"],
};

export function ProjectServicesClient({ projectId }: { projectId: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const response = await fetch(`/api/core/projects/${projectId}/services`, {
          credentials: "include",
        });
        const payload = await response.json();
        if (!active) return;
        if (!response.ok) {
          setError(payload?.error?.message ?? "Could not load services.");
          return;
        }
        setServices(payload.data ?? []);
        const firstAvailable = (payload.data ?? []).find((item: Service) => item.status === "available");
        setSelectedServiceId(firstAvailable?.id ?? payload.data?.[0]?.id ?? "");
      } catch {
        if (active) setError("Network error. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void run();
    return () => { active = false; };
  }, [projectId]);

  const selectedService = services.find((service) => service.id === selectedServiceId) ?? services[0];

  return (
    <div className={styles.appShell}>
      {/* Top bar */}
      <header className={styles.topBar}>
        <div className={styles.topBarBrand}>
          <span className={styles.logoMark}>B</span>
          <span className={styles.logoText}>Buildstack</span>
        </div>
        <div className={styles.topBarRight}>
          <Link href="/" className={styles.backLink}>← All projects</Link>
        </div>
      </header>

      <main className={styles.dashMain}>
        <div className={styles.dashHeader}>
          <div>
            <h1 className={styles.dashTitle}>Project services</h1>
            <p className={styles.dashSub}>
              Everything your backend needs — auth, data, APIs, and analytics — isolated to this project.
            </p>
          </div>
        </div>

        {loading ? (
          <p className={styles.loadingText}>Loading services…</p>
        ) : error ? (
          <p className={styles.errorBanner}>{error}</p>
        ) : (
          <>
            <ul className={styles.serviceGrid}>
              {services.map((service) => {
                const icon = SERVICE_ICONS[service.id] ?? "🔧";
                const color = SERVICE_COLORS[service.id] ?? "#6b7280";
                const isSelected = selectedServiceId === service.id;
                return (
                  <li key={service.id}>
                    <button
                      type="button"
                      className={`${styles.serviceCardButton} ${isSelected ? styles.serviceCardButtonActive : ""}`}
                      style={{ "--service-color": color } as React.CSSProperties}
                      onClick={() => setSelectedServiceId(service.id)}
                    >
                      <div className={styles.serviceCardIcon}>{icon}</div>
                      <div className={styles.serviceCardBody}>
                        <h2 className={styles.serviceCardName}>{service.name}</h2>
                        <p className={styles.serviceCardDesc}>{service.description}</p>
                      </div>
                      <span className={service.status === "available" ? styles.statusAvailable : styles.statusSoon}>
                        {service.status === "available" ? "Available" : "Coming soon"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {selectedService ? (
              <section className={styles.serviceConsole}>
                <header className={styles.serviceConsoleHeader}>
                  <h2>
                    {SERVICE_ICONS[selectedService.id] ?? "🔧"} {selectedService.name} console
                  </h2>
                  <p>{selectedService.description}</p>
                </header>

                <div className={styles.serviceActionRow}>
                  {(SERVICE_ACTIONS[selectedService.id] ?? ["Open service"]).map((action) => (
                    <button
                      key={action}
                      type="button"
                      className={styles.serviceActionButton}
                      disabled={selectedService.status !== "available"}
                    >
                      {action}
                    </button>
                  ))}
                </div>

                {selectedService.status !== "available" ? (
                  <p className={styles.serviceSoonNote}>This service is listed but not enabled yet for this project.</p>
                ) : null}
              </section>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
