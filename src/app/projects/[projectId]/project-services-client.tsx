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

type ApiKeySummary = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
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
  const [csrfToken, setCsrfToken] = useState("");
  const [apiKeys, setApiKeys] = useState<ApiKeySummary[]>([]);
  const [apiKeyName, setApiKeyName] = useState("");
  const [apiKeySecret, setApiKeySecret] = useState("");
  const [apiBusy, setApiBusy] = useState(false);

  const captureCsrf = (response: Response) => {
    const token = response.headers.get("x-csrf-token");
    if (token) {
      setCsrfToken(token);
    }
  };

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const response = await fetch(`/api/core/projects/${projectId}/services`, {
          credentials: "include",
        });
        captureCsrf(response);
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

  useEffect(() => {
    if (selectedServiceId !== "api") {
      return;
    }

    let active = true;

    const loadApiKeys = async () => {
      try {
        const response = await fetch(`/api/core/projects/${projectId}/api-keys`, {
          credentials: "include",
        });
        captureCsrf(response);
        const payload = await response.json();
        if (!active) return;
        if (!response.ok) {
          setError(payload?.error?.message ?? "Could not load API keys.");
          return;
        }
        setApiKeys(payload.data ?? []);
      } catch {
        if (active) setError("Network error. Please try again.");
      }
    };

    void loadApiKeys();

    return () => {
      active = false;
    };
  }, [projectId, selectedServiceId]);

  const createApiKey = async () => {
    const name = apiKeyName.trim() || `Key ${apiKeys.length + 1}`;
    setApiBusy(true);
    setError("");
    setApiKeySecret("");

    try {
      const response = await fetch(`/api/core/projects/${projectId}/api-keys`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        body: JSON.stringify({ name }),
      });
      captureCsrf(response);
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "Could not create API key.");
        return;
      }
      setApiKeys((current) => [payload.data.apiKey, ...current]);
      setApiKeySecret(payload.data.secret);
      setApiKeyName("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setApiBusy(false);
    }
  };

  const revokeApiKey = async (keyId: string) => {
    setApiBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/core/projects/${projectId}/api-keys/${keyId}`, {
        method: "DELETE",
        credentials: "include",
        headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
      });
      captureCsrf(response);
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "Could not revoke API key.");
        return;
      }
      setApiKeys((current) => current.filter((item) => item.id !== keyId));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setApiBusy(false);
    }
  };

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

                {selectedService.id === "api" && selectedService.status === "available" ? (
                  <div className={styles.apiKeyPanel}>
                    <div className={styles.createFormRow}>
                      <input
                        className={styles.createInput}
                        value={apiKeyName}
                        onChange={(event) => setApiKeyName(event.target.value)}
                        placeholder="API key name, e.g. Mobile app"
                      />
                      <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={() => void createApiKey()}
                        disabled={apiBusy}
                      >
                        {apiBusy ? "Working..." : "Generate API key"}
                      </button>
                    </div>

                    {apiKeySecret ? (
                      <div className={styles.apiKeyReveal}>
                        <p className={styles.projectCardDate}>Copy this key now. It will not be shown again.</p>
                        <code className={styles.apiKeyValue}>{apiKeySecret}</code>
                      </div>
                    ) : null}

                    <div className={styles.apiKeyList}>
                      {apiKeys.length === 0 ? (
                        <p className={styles.projectCardDate}>No API keys yet for this project.</p>
                      ) : (
                        apiKeys.map((item) => (
                          <div key={item.id} className={styles.apiKeyItem}>
                            <div>
                              <p className={styles.createFormTitle}>{item.name}</p>
                              <p className={styles.projectCardDate}>{item.keyPrefix}...</p>
                              <p className={styles.projectCardDate}>
                                Created {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                            </div>
                            <button
                              type="button"
                              className={styles.serviceActionButton}
                              onClick={() => void revokeApiKey(item.id)}
                              disabled={apiBusy}
                            >
                              Revoke
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
