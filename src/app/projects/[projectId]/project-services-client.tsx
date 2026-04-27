"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import styles from "../../page.module.css";
import {
  SERVICE_COLORS,
  SERVICE_CONFIGURATION,
  SERVICE_ICONS,
  SERVICE_INSIGHTS,
  type ProjectServiceId,
} from "./service-config";

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

type ProjectSummary = {
  id: string;
  key: string;
  schemaName: string;
  displayName: string;
  role: "owner" | "admin" | "member";
  createdAt: string;
  usage: {
    storageBytes: number;
  };
};

type AnalyticsSnapshot = {
  uptimeSeconds: number;
  totalTrackedRequests: number;
  totalTrackedErrors: number;
  routes: Array<{
    key: string;
    count: number;
    errorCount: number;
    avgDurationMs: number;
    errorRate: number;
  }>;
};

type ServiceDetails =
  | {
      service: "auth";
      auth: {
        totalUsers: number;
        activeSessions: number;
        totalSessions: number;
        recentUsers: Array<{
          id: string;
          email: string;
          createdAt: string;
        }>;
      };
    }
  | {
      service: "database";
      database: {
        totalRecords: number;
        totalCollections: number;
        collections: Array<{
          name: string;
          count: number;
        }>;
      };
    }
  | {
      service: "api";
      api: {
        activeApiKeys: number;
      };
    };

function getServiceHref(projectId: string, serviceId: string) {
  return `/projects/${projectId}/${serviceId}`;
}

function isKnownServiceId(serviceId: string): serviceId is ProjectServiceId {
  return serviceId in SERVICE_ICONS;
}

function formatStorage(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes} B`;
}

function formatUptime(seconds: number) {
  if (seconds >= 3600) {
    return `${(seconds / 3600).toFixed(1)}h`;
  }

  if (seconds >= 60) {
    return `${Math.round(seconds / 60)}m`;
  }

  return `${seconds}s`;
}

export function ProjectServicesClient({
  projectId,
  serviceId,
}: {
  projectId: string;
  serviceId?: ProjectServiceId;
}) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeySummary[]>([]);
  const [apiKeyName, setApiKeyName] = useState("");
  const [apiKeySecret, setApiKeySecret] = useState("");
  const [apiBusy, setApiBusy] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null);
  const [serviceDetails, setServiceDetails] = useState<ServiceDetails | null>(null);

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

        const projectResponse = await fetch("/api/core/projects", {
          credentials: "include",
        });
        captureCsrf(projectResponse);
        const projectPayload = await projectResponse.json();
        if (!active) return;
        if (!projectResponse.ok) {
          setError(projectPayload?.error?.message ?? "Could not load project details.");
          return;
        }

        const matchedProject = (projectPayload.data ?? []).find((item: ProjectSummary) => item.id === projectId) ?? null;
        setProject(matchedProject);
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
    if (serviceId !== "analytics") {
      return;
    }

    let active = true;

    const loadAnalytics = async () => {
      try {
        const response = await fetch("/api/core/analytics", {
          credentials: "include",
        });
        captureCsrf(response);
        const payload = await response.json();
        if (!active) return;
        if (!response.ok) {
          setError(payload?.error?.message ?? "Could not load analytics.");
          return;
        }
        setAnalytics(payload.data ?? null);
      } catch {
        if (active) setError("Network error. Please try again.");
      }
    };

    void loadAnalytics();

    return () => {
      active = false;
    };
  }, [serviceId]);

  useEffect(() => {
    if (!serviceId || !["auth", "database", "api"].includes(serviceId)) {
      setServiceDetails(null);
      return;
    }

    let active = true;

    const loadServiceDetails = async () => {
      try {
        const response = await fetch(`/api/core/projects/${projectId}/service-details?service=${serviceId}`, {
          credentials: "include",
        });
        captureCsrf(response);
        const payload = await response.json();
        if (!active) return;
        if (!response.ok) {
          setError(payload?.error?.message ?? "Could not load service details.");
          return;
        }
        setServiceDetails(payload.data ?? null);
      } catch {
        if (active) setError("Network error. Please try again.");
      }
    };

    void loadServiceDetails();

    return () => {
      active = false;
    };
  }, [projectId, serviceId]);

  useEffect(() => {
    if (serviceId !== "api") {
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
  }, [projectId, serviceId]);

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

  const selectedService = serviceId
    ? services.find((service) => service.id === serviceId)
    : null;
  const selectedKnownServiceId = selectedService && isKnownServiceId(selectedService.id) ? selectedService.id : null;
  const authBasePath = project ? `/api/v1/${project.key}/auth` : "";
  const recordsBasePath = project ? `/api/v1/${project.key}/records` : "";
  const topRoutes = analytics?.routes.slice().sort((a, b) => b.count - a.count).slice(0, 5) ?? [];

  const renderServiceOptions = () => {
    if (!selectedKnownServiceId || !project) {
      return null;
    }

    if (selectedKnownServiceId === "auth") {
      return (
        <div className={styles.serviceOptionGrid}>
          <Link href={`#auth-endpoints`} className={styles.serviceOptionCard}>
            <span className={styles.serviceOptionTitle}>View auth endpoints</span>
            <span className={styles.serviceOptionText}>Register, login, and logout routes for this project.</span>
          </Link>
          <Link href={`/projects/${projectId}/api`} className={styles.serviceOptionCard}>
            <span className={styles.serviceOptionTitle}>Manage project API keys</span>
            <span className={styles.serviceOptionText}>Open the API service page to issue or revoke X-Api-Key credentials.</span>
          </Link>
          <Link href={`#auth-storage`} className={styles.serviceOptionCard}>
            <span className={styles.serviceOptionTitle}>Inspect auth storage</span>
            <span className={styles.serviceOptionText}>See where app users and sessions are stored inside this project.</span>
          </Link>
        </div>
      );
    }

    if (selectedKnownServiceId === "database") {
      return (
        <div className={styles.serviceOptionGrid}>
          <Link href={`#database-schema`} className={styles.serviceOptionCard}>
            <span className={styles.serviceOptionTitle}>Inspect schema details</span>
            <span className={styles.serviceOptionText}>See the exact schema name and managed tables for this project.</span>
          </Link>
          <Link href={`#database-usage`} className={styles.serviceOptionCard}>
            <span className={styles.serviceOptionTitle}>Check storage usage</span>
            <span className={styles.serviceOptionText}>Review the current tracked footprint for this project's data.</span>
          </Link>
          <Link href={`/projects/${projectId}/api`} className={styles.serviceOptionCard}>
            <span className={styles.serviceOptionTitle}>Open records API</span>
            <span className={styles.serviceOptionText}>The records endpoints are the live access layer for project data.</span>
          </Link>
        </div>
      );
    }

    if (selectedKnownServiceId === "api") {
      return (
        <div className={styles.serviceOptionGrid}>
          <Link href={`#api-endpoints`} className={styles.serviceOptionCard}>
            <span className={styles.serviceOptionTitle}>Inspect live endpoints</span>
            <span className={styles.serviceOptionText}>See the exact auth and records routes for this project key.</span>
          </Link>
          <Link href={`#api-keys`} className={styles.serviceOptionCard}>
            <span className={styles.serviceOptionTitle}>Manage API keys</span>
            <span className={styles.serviceOptionText}>Issue and revoke keys used by external apps.</span>
          </Link>
          <Link href={`/projects/${projectId}/analytics`} className={styles.serviceOptionCard}>
            <span className={styles.serviceOptionTitle}>Review API activity</span>
            <span className={styles.serviceOptionText}>Open analytics to inspect request volume and errors.</span>
          </Link>
        </div>
      );
    }

    if (selectedKnownServiceId === "analytics") {
      return (
        <div className={styles.serviceOptionGrid}>
          <a href="/api/core/analytics" target="_blank" rel="noreferrer" className={styles.serviceOptionCard}>
            <span className={styles.serviceOptionTitle}>Open raw analytics JSON</span>
            <span className={styles.serviceOptionText}>Inspect the current in-memory analytics snapshot directly.</span>
          </a>
          <a href="/api/core/analytics?format=prometheus" target="_blank" rel="noreferrer" className={styles.serviceOptionCard}>
            <span className={styles.serviceOptionTitle}>Open Prometheus metrics</span>
            <span className={styles.serviceOptionText}>Use bearer auth to scrape metrics in Prometheus format.</span>
          </a>
          <Link href={`#analytics-routes`} className={styles.serviceOptionCard}>
            <span className={styles.serviceOptionTitle}>Inspect busiest routes</span>
            <span className={styles.serviceOptionText}>See which routes are generating the most tracked traffic.</span>
          </Link>
        </div>
      );
    }

    return null;
  };

  const renderServiceSpecificDetail = () => {
    if (!selectedKnownServiceId || !project) {
      return null;
    }

    if (selectedKnownServiceId === "auth") {
      return (
        <>
          {serviceDetails?.service === "auth" ? (
            <div className={styles.serviceSection}>
              <h3 className={styles.serviceSectionTitle}>Live auth activity</h3>
              <div className={styles.serviceMetaGrid}>
                <div className={styles.serviceMetaCard}>
                  <p className={styles.serviceMetaLabel}>App users</p>
                  <p className={styles.serviceMetaValue}>{serviceDetails.auth.totalUsers}</p>
                </div>
                <div className={styles.serviceMetaCard}>
                  <p className={styles.serviceMetaLabel}>Active sessions</p>
                  <p className={styles.serviceMetaValue}>{serviceDetails.auth.activeSessions}</p>
                </div>
                <div className={styles.serviceMetaCard}>
                  <p className={styles.serviceMetaLabel}>Total sessions</p>
                  <p className={styles.serviceMetaValue}>{serviceDetails.auth.totalSessions}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div id="auth-storage" className={styles.serviceSection}>
            <h3 className={styles.serviceSectionTitle}>Auth storage for this project</h3>
            <div className={styles.serviceMetaGrid}>
              <div className={styles.serviceMetaCard}>
                <p className={styles.serviceMetaLabel}>Project schema</p>
                <p className={styles.serviceMetaValue}>{project.schemaName}</p>
              </div>
              <div className={styles.serviceMetaCard}>
                <p className={styles.serviceMetaLabel}>User table</p>
                <p className={styles.serviceMetaValue}>{project.schemaName}.app_users</p>
              </div>
              <div className={styles.serviceMetaCard}>
                <p className={styles.serviceMetaLabel}>Session table</p>
                <p className={styles.serviceMetaValue}>{project.schemaName}.app_sessions</p>
              </div>
            </div>
          </div>

          <div id="auth-endpoints" className={styles.serviceSection}>
            <h3 className={styles.serviceSectionTitle}>Live auth endpoints</h3>
            <div className={styles.endpointList}>
              <code className={styles.endpointItem}>POST {authBasePath}/register</code>
              <code className={styles.endpointItem}>POST {authBasePath}/login</code>
              <code className={styles.endpointItem}>POST {authBasePath}/logout</code>
            </div>
          </div>

          {serviceDetails?.service === "auth" ? (
            <div className={styles.serviceSection}>
              <h3 className={styles.serviceSectionTitle}>Recent app users</h3>
              {serviceDetails.auth.recentUsers.length === 0 ? (
                <p className={styles.projectCardDate}>No app users have registered for this project yet.</p>
              ) : (
                <div className={styles.analyticsRouteList}>
                  {serviceDetails.auth.recentUsers.map((user) => (
                    <div key={user.id} className={styles.analyticsRouteItem}>
                      <div>
                        <p className={styles.createFormTitle}>{user.email}</p>
                        <p className={styles.projectCardDate}>{user.id}</p>
                      </div>
                      <div className={styles.analyticsRouteStats}>
                        <span>
                          {new Date(user.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </>
      );
    }

    if (selectedKnownServiceId === "database") {
      return (
        <>
          {serviceDetails?.service === "database" ? (
            <div className={styles.serviceSection}>
              <h3 className={styles.serviceSectionTitle}>Live database activity</h3>
              <div className={styles.serviceMetaGrid}>
                <div className={styles.serviceMetaCard}>
                  <p className={styles.serviceMetaLabel}>Total records</p>
                  <p className={styles.serviceMetaValue}>{serviceDetails.database.totalRecords}</p>
                </div>
                <div className={styles.serviceMetaCard}>
                  <p className={styles.serviceMetaLabel}>Collections</p>
                  <p className={styles.serviceMetaValue}>{serviceDetails.database.totalCollections}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div id="database-schema" className={styles.serviceSection}>
            <h3 className={styles.serviceSectionTitle}>Schema details</h3>
            <div className={styles.serviceMetaGrid}>
              <div className={styles.serviceMetaCard}>
                <p className={styles.serviceMetaLabel}>Schema name</p>
                <p className={styles.serviceMetaValue}>{project.schemaName}</p>
              </div>
              <div className={styles.serviceMetaCard}>
                <p className={styles.serviceMetaLabel}>Records table</p>
                <p className={styles.serviceMetaValue}>{project.schemaName}.records</p>
              </div>
              <div className={styles.serviceMetaCard}>
                <p className={styles.serviceMetaLabel}>Project key</p>
                <p className={styles.serviceMetaValue}>{project.key}</p>
              </div>
            </div>
          </div>

          <div id="database-usage" className={styles.serviceSection}>
            <h3 className={styles.serviceSectionTitle}>Tracked storage usage</h3>
            <div className={styles.serviceMetaGrid}>
              <div className={styles.serviceMetaCard}>
                <p className={styles.serviceMetaLabel}>Current footprint</p>
                <p className={styles.serviceMetaValue}>{formatStorage(project.usage.storageBytes)}</p>
              </div>
              <div className={styles.serviceMetaCard}>
                <p className={styles.serviceMetaLabel}>Created</p>
                <p className={styles.serviceMetaValue}>
                  {new Date(project.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          {serviceDetails?.service === "database" ? (
            <div className={styles.serviceSection}>
              <h3 className={styles.serviceSectionTitle}>Collections in this project</h3>
              {serviceDetails.database.collections.length === 0 ? (
                <p className={styles.projectCardDate}>No records written yet for this project.</p>
              ) : (
                <div className={styles.analyticsRouteList}>
                  {serviceDetails.database.collections.map((collection) => (
                    <div key={collection.name} className={styles.analyticsRouteItem}>
                      <div>
                        <p className={styles.createFormTitle}>{collection.name}</p>
                        <p className={styles.projectCardDate}>JSONB-backed collection</p>
                      </div>
                      <div className={styles.analyticsRouteStats}>
                        <span>{collection.count} rows</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </>
      );
    }

    if (selectedKnownServiceId === "api") {
      return (
        <>
          {serviceDetails?.service === "api" ? (
            <div className={styles.serviceSection}>
              <h3 className={styles.serviceSectionTitle}>API access state</h3>
              <div className={styles.serviceMetaGrid}>
                <div className={styles.serviceMetaCard}>
                  <p className={styles.serviceMetaLabel}>Active API keys</p>
                  <p className={styles.serviceMetaValue}>{serviceDetails.api.activeApiKeys}</p>
                </div>
                <div className={styles.serviceMetaCard}>
                  <p className={styles.serviceMetaLabel}>Project key</p>
                  <p className={styles.serviceMetaValue}>{project.key}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div id="api-endpoints" className={styles.serviceSection}>
            <h3 className={styles.serviceSectionTitle}>Live project endpoints</h3>
            <div className={styles.endpointList}>
              <code className={styles.endpointItem}>POST {authBasePath}/register</code>
              <code className={styles.endpointItem}>POST {authBasePath}/login</code>
              <code className={styles.endpointItem}>POST {authBasePath}/logout</code>
              <code className={styles.endpointItem}>GET {recordsBasePath}</code>
              <code className={styles.endpointItem}>POST {recordsBasePath}</code>
              <code className={styles.endpointItem}>GET {recordsBasePath}/:recordId</code>
              <code className={styles.endpointItem}>PATCH {recordsBasePath}/:recordId</code>
              <code className={styles.endpointItem}>DELETE {recordsBasePath}/:recordId</code>
            </div>
          </div>
        </>
      );
    }

    if (selectedKnownServiceId === "analytics") {
      return (
        <>
          <div className={styles.serviceSection}>
            <h3 className={styles.serviceSectionTitle}>Current analytics snapshot</h3>
            <div className={styles.serviceMetaGrid}>
              <div className={styles.serviceMetaCard}>
                <p className={styles.serviceMetaLabel}>Uptime</p>
                <p className={styles.serviceMetaValue}>{analytics ? formatUptime(analytics.uptimeSeconds) : "Loading..."}</p>
              </div>
              <div className={styles.serviceMetaCard}>
                <p className={styles.serviceMetaLabel}>Tracked requests</p>
                <p className={styles.serviceMetaValue}>{analytics?.totalTrackedRequests ?? 0}</p>
              </div>
              <div className={styles.serviceMetaCard}>
                <p className={styles.serviceMetaLabel}>Tracked errors</p>
                <p className={styles.serviceMetaValue}>{analytics?.totalTrackedErrors ?? 0}</p>
              </div>
            </div>
          </div>

          <div id="analytics-routes" className={styles.serviceSection}>
            <h3 className={styles.serviceSectionTitle}>Busiest tracked routes</h3>
            {topRoutes.length === 0 ? (
              <p className={styles.projectCardDate}>No tracked traffic yet in this process.</p>
            ) : (
              <div className={styles.analyticsRouteList}>
                {topRoutes.map((route) => (
                  <div key={route.key} className={styles.analyticsRouteItem}>
                    <div>
                      <p className={styles.createFormTitle}>{route.key}</p>
                      <p className={styles.projectCardDate}>Avg {route.avgDurationMs} ms</p>
                    </div>
                    <div className={styles.analyticsRouteStats}>
                      <span>{route.count} req</span>
                      <span>{route.errorRate}% err</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      );
    }

    return null;
  };

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
            <h1 className={styles.dashTitle}>{serviceId ? `${selectedService?.name ?? "Service"} service` : "Project services"}</h1>
            <p className={styles.dashSub}>
              {serviceId
                ? "This page shows the service status, configuration, and the management options available for this project."
                : "Everything your backend needs — auth, data, APIs, and analytics — isolated to this project."}
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
                const icon = isKnownServiceId(service.id) ? SERVICE_ICONS[service.id] : "🔧";
                const color = isKnownServiceId(service.id) ? SERVICE_COLORS[service.id] : "#6b7280";
                const isSelected = serviceId === service.id;
                return (
                  <li key={service.id}>
                    <Link
                      href={getServiceHref(projectId, service.id)}
                      className={`${styles.serviceCardButton} ${isSelected ? styles.serviceCardButtonActive : ""}`}
                      style={{ "--service-color": color } as React.CSSProperties}
                      aria-current={isSelected ? "page" : undefined}
                    >
                      <div className={styles.serviceCardIcon}>{icon}</div>
                      <div className={styles.serviceCardBody}>
                        <h2 className={styles.serviceCardName}>{service.name}</h2>
                        <p className={styles.serviceCardDesc}>{service.description}</p>
                      </div>
                      <span className={service.status === "available" ? styles.statusAvailable : styles.statusSoon}>
                        {service.status === "available" ? "Available" : "Coming soon"}
                      </span>
                      <span className={styles.serviceCardCta}>{isSelected ? "Viewing service" : "Open service →"}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {selectedService && selectedKnownServiceId ? (
              <section className={styles.serviceConsole}>
                <header className={styles.serviceConsoleHeader}>
                  <h2>
                    {SERVICE_ICONS[selectedKnownServiceId]} {selectedService.name} console
                  </h2>
                  <p>{selectedService.description}</p>
                </header>

                <div className={styles.serviceMetaGrid}>
                  {SERVICE_INSIGHTS[selectedKnownServiceId].map((item) => (
                    <div key={item.label} className={styles.serviceMetaCard}>
                      <p className={styles.serviceMetaLabel}>{item.label}</p>
                      <p className={styles.serviceMetaValue}>{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className={styles.serviceSection}>
                  <h3 className={styles.serviceSectionTitle}>Configuration in this project</h3>
                  <ul className={styles.serviceList}>
                    {SERVICE_CONFIGURATION[selectedKnownServiceId].map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className={styles.serviceSection}>
                  <h3 className={styles.serviceSectionTitle}>Available options</h3>
                  {renderServiceOptions()}
                </div>

                {renderServiceSpecificDetail()}

                {selectedService.status !== "available" ? (
                  <p className={styles.serviceSoonNote}>This service is listed but not enabled yet for this project.</p>
                ) : null}

                {selectedKnownServiceId === "api" && selectedService.status === "available" ? (
                  <div id="api-keys" className={styles.apiKeyPanel}>
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
            ) : !serviceId ? (
              <section className={styles.serviceConsole}>
                <header className={styles.serviceConsoleHeader}>
                  <h2>Open a service</h2>
                  <p>Select any service card to open its dedicated page and inspect what is running, how it is configured, and which options are available for this project.</p>
                </header>
              </section>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
