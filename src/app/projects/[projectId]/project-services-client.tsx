"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import styles from "../../page.module.css";
import {
  API_KEY_SCOPES,
  type ApiKeyScope,
} from "@/core/rbac/permissions";
import {
  SERVICE_COLORS,
  SERVICE_ICONS,
  type ProjectServiceId,
} from "./service-config";

type Service = {
  id: ProjectServiceId;
  name: string;
  description: string;
  status: "available" | "coming-soon";
};

type ApiKeySummary = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

type ProjectSummary = {
  id: string;
  key: string;
  schemaName: string;
  displayName: string;
  role: "owner" | "admin" | "member" | "viewer";
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
    }
  | {
      service: "logs";
      logs: {
        recentCount: number;
      };
    }
  | {
      service: "usage";
      usage: {
        totalEvents: number;
        totalQuantity: number;
      };
    };

type AuditLogEntry = {
  id: string;
  action: string;
  status: string;
  actorUserId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  createdAt: string;
};

type UsageLogEntry = {
  id: string;
  metric: string;
  quantity: number;
  createdAt: string;
};

type UsageSummary = {
  totalEvents: number;
  totalQuantity: number;
  byMetric: Array<{
    metric: string;
    events: number;
    quantity: number;
  }>;
};

type ServicePanelId =
  | "summary"
  | "endpoints"
  | "users"
  | "storage"
  | "collections"
  | "connect"
  | "keys"
  | "routes"
  | "metrics";

// Build the route for a service card. This keeps navigation logic in one place.
function getServiceHref(projectId: string, serviceId: string) {
  return `/projects/${projectId}/${serviceId}`;
}

// Narrow arbitrary route values to the fixed service set we support in the dashboard.
function isKnownServiceId(serviceId: string): serviceId is ProjectServiceId {
  return serviceId in SERVICE_ICONS;
}

// Present raw storage bytes in a human-readable format for dashboard summaries.
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

// Present uptime in the shortest useful unit for compact status cards.
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
  const [apiKeyScopes, setApiKeyScopes] = useState<ApiKeyScope[]>([]);
  const [apiKeySecret, setApiKeySecret] = useState("");
  const [sessionApiKeySecrets, setSessionApiKeySecrets] = useState<Record<string, string>>({});
  const [apiBusy, setApiBusy] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState("");
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null);
  const [serviceDetails, setServiceDetails] = useState<ServiceDetails | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageLogEntry[]>([]);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [activeServicePanel, setActiveServicePanel] = useState<ServicePanelId>("summary");
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string | null>(null);
  const [selectedRouteKey, setSelectedRouteKey] = useState<string | null>(null);
  const [selectedOverviewServiceId, setSelectedOverviewServiceId] = useState<string>("");

  // Keep the latest CSRF token from any successful API response.
  const captureCsrf = (response: Response) => {
    const token = response.headers.get("x-csrf-token");
    if (token) {
      setCsrfToken(token);
    }
  };

  // Load the base project and service list once on mount.
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

  // Analytics is the only service that needs its own runtime snapshot fetch.
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

  // Fetch service-specific data only for the routes that actually expose extra details.
  useEffect(() => {
    if (!serviceId || !["auth", "database", "api", "logs", "usage"].includes(serviceId)) {
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
    if (serviceId !== "logs") {
      return;
    }

    let active = true;

    const loadLogs = async () => {
      try {
        const response = await fetch(`/api/core/projects/${projectId}/logs?limit=50`, {
          credentials: "include",
        });
        captureCsrf(response);
        const payload = await response.json();
        if (!active) return;
        if (!response.ok) {
          setError(payload?.error?.message ?? "Could not load logs.");
          return;
        }
        setAuditLogs(payload.data?.items ?? []);
      } catch {
        if (active) setError("Network error. Please try again.");
      }
    };

    void loadLogs();

    return () => {
      active = false;
    };
  }, [projectId, serviceId]);

  useEffect(() => {
    if (serviceId !== "usage") {
      return;
    }

    let active = true;

    const loadUsage = async () => {
      try {
        const response = await fetch(`/api/core/projects/${projectId}/usage?limit=50`, {
          credentials: "include",
        });
        captureCsrf(response);
        const payload = await response.json();
        if (!active) return;
        if (!response.ok) {
          setError(payload?.error?.message ?? "Could not load usage.");
          return;
        }
        setUsageLogs(payload.data?.items ?? []);
        setUsageSummary(payload.data?.summary ?? null);
      } catch {
        if (active) setError("Network error. Please try again.");
      }
    };

    void loadUsage();

    return () => {
      active = false;
    };
  }, [projectId, serviceId]);

  // API keys only matter on the API view, so we keep that fetch scoped to this route.
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

  useEffect(() => {
    const timer = setTimeout(() => {
    if (serviceId === "api") {
      setSelectedApiKeyId((current) => current ?? null);
    } else {
      setSelectedApiKeyId(null);
    }
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [serviceId]);

  useEffect(() => {
    const timer = setTimeout(() => {
    if (serviceId === "api" && activeServicePanel === "keys" && apiKeys.length > 0) {
      setSelectedApiKeyId((current) => current ?? apiKeys[0].id);
    }
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [apiKeys, activeServicePanel, serviceId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (analytics?.routes.length) {
        setSelectedRouteKey((current) => {
          if (current && analytics.routes.some((route) => route.key === current)) {
            return current;
          }

          return analytics.routes[0].key;
        });
      } else {
        setSelectedRouteKey(null);
      }
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [analytics]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveServicePanel("summary");
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [serviceId]);

  useEffect(() => {
    const timer = setTimeout(() => {
    if (serviceId) {
      return;
    }

    if (services.length > 0) {
      setSelectedOverviewServiceId((current) => {
        if (current && services.some((service) => service.id === current)) {
          return current;
        }

        return services[0].id;
      });
    }
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [services, serviceId]);

  const createApiKey = async () => {
    const name = apiKeyName.trim() || `Key ${apiKeys.length + 1}`;
    const scopes = apiKeyScopes.length ? apiKeyScopes : undefined;
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
        body: JSON.stringify({ name, scopes }),
      });
      captureCsrf(response);
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "Could not create API key.");
        return;
      }
      setApiKeys((current) => [payload.data.apiKey, ...current]);
      setApiKeySecret(payload.data.secret);
      setSelectedApiKeyId(payload.data.apiKey.id);
      setSessionApiKeySecrets((current) => ({
        ...current,
        [payload.data.apiKey.id]: payload.data.secret,
      }));
      setApiKeyName("");
      setApiKeyScopes([]);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setApiBusy(false);
    }
  };

  const toggleApiKeyScope = (scope: ApiKeyScope) => {
    setApiKeyScopes((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope],
    );
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
      setApiKeys((current) =>
        current.map((item) =>
          item.id === keyId
            ? {
                ...item,
                revokedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setApiBusy(false);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    const confirmed = window.confirm("Delete this revoked API key permanently?");
    if (!confirmed) {
      return;
    }

    setApiBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/core/projects/${projectId}/api-keys/${keyId}?mode=delete`, {
        method: "DELETE",
        credentials: "include",
        headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
      });
      captureCsrf(response);
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "Could not delete API key.");
        return;
      }
      setApiKeys((current) => current.filter((item) => item.id !== keyId));
      setSelectedApiKeyId((current) => (current === keyId ? null : current));
      setSessionApiKeySecrets((current) => {
        const next = { ...current };
        delete next[keyId];
        return next;
      });
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
  const selectedOverviewService = !serviceId
    ? services.find((service) => service.id === selectedOverviewServiceId) ?? services[0] ?? null
    : null;
  const selectedOverviewKnownServiceId = selectedOverviewService && isKnownServiceId(selectedOverviewService.id)
    ? selectedOverviewService.id
    : null;
  const isApiView = selectedKnownServiceId === "api";
  const authBasePath = project ? `/api/v1/${project.key}/auth` : "";
  const recordsBasePath = project ? `/api/v1/${project.key}/records` : "";
  const projectApiKey = apiKeySecret || "<your-api-key>";
  const publicBaseUrl = typeof window === "undefined" ? "https://stack.builddeck.io" : window.location.origin;
  const recordsSnippet = `await fetch("${publicBaseUrl}${recordsBasePath}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${projectApiKey}",
  },
  body: JSON.stringify({
    collection: "todos",
    ownerId: "user-id",
    data: { title: "Ship Buildstack", done: false },
  }),
});`;
  const topRoutes = analytics?.routes.slice().sort((a, b) => b.count - a.count).slice(0, 5) ?? [];

  const copySnippet = async (label: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedSnippet(label);
      setTimeout(() => {
        setCopiedSnippet("");
      }, 1400);
    } catch {
      setError("Could not copy snippet. Please copy manually.");
    }
  };

  const renderServiceSpecificDetail = () => {
    if (!selectedKnownServiceId || !project) {
      return null;
    }

    if (selectedKnownServiceId === "auth") {
      return (
        <div className={styles.serviceDetailSplit}>
          <div className={styles.serviceDetailNav}>
            <button
              type="button"
              className={`${styles.serviceDetailNavButton} ${activeServicePanel === "summary" ? styles.serviceDetailNavButtonActive : ""}`}
              onClick={() => setActiveServicePanel("summary")}
              aria-pressed={activeServicePanel === "summary"}
            >
              Overview
            </button>
            <button
              type="button"
              className={`${styles.serviceDetailNavButton} ${activeServicePanel === "endpoints" ? styles.serviceDetailNavButtonActive : ""}`}
              onClick={() => setActiveServicePanel("endpoints")}
              aria-pressed={activeServicePanel === "endpoints"}
            >
              Endpoints
            </button>
            <button
              type="button"
              className={`${styles.serviceDetailNavButton} ${activeServicePanel === "users" ? styles.serviceDetailNavButtonActive : ""}`}
              onClick={() => setActiveServicePanel("users")}
              aria-pressed={activeServicePanel === "users"}
            >
              Users
            </button>
          </div>

          <div className={styles.serviceDetailPanel}>
            {activeServicePanel === "summary" ? (
              <div className={styles.serviceSection}>
                <h3 className={styles.serviceSectionTitle}>Auth Summary</h3>
                <div className={styles.serviceMetaGrid}>
                  {serviceDetails?.service === "auth" ? (
                    <>
                      <div className={styles.serviceMetaCard}>
                        <p className={styles.serviceMetaLabel}>Users</p>
                        <p className={styles.serviceMetaValue}>{serviceDetails.auth.totalUsers}</p>
                      </div>
                      <div className={styles.serviceMetaCard}>
                        <p className={styles.serviceMetaLabel}>Active sessions</p>
                        <p className={styles.serviceMetaValue}>{serviceDetails.auth.activeSessions}</p>
                      </div>
                    </>
                  ) : null}
                  <div className={styles.serviceMetaCard}>
                    <p className={styles.serviceMetaLabel}>Project schema</p>
                    <p className={styles.serviceMetaValue}>{project.schemaName}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {activeServicePanel === "endpoints" ? (
              <div className={styles.serviceSection}>
                <h3 className={styles.serviceSectionTitle}>Live auth endpoints</h3>
                <div className={styles.endpointList}>
                  <code className={styles.endpointItem}>POST {authBasePath}/register</code>
                  <code className={styles.endpointItem}>POST {authBasePath}/login</code>
                  <code className={styles.endpointItem}>POST {authBasePath}/logout</code>
                </div>
              </div>
            ) : null}

            {activeServicePanel === "users" ? (
              <div className={styles.serviceSection}>
                <h3 className={styles.serviceSectionTitle}>Recent Users</h3>
                {serviceDetails?.service === "auth" && serviceDetails.auth.recentUsers.length > 0 ? (
                  <div className={styles.analyticsRouteList}>
                    {serviceDetails.auth.recentUsers.slice(0, 5).map((user) => (
                      <div key={user.id} className={styles.analyticsRouteItem}>
                        <div>
                          <p className={styles.createFormTitle}>{user.email}</p>
                        </div>
                        <div className={styles.analyticsRouteStats}>
                          <span>
                            {new Date(user.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.projectCardDate}>No users have registered yet.</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    if (selectedKnownServiceId === "database") {
      return (
        <div className={styles.serviceDetailSplit}>
          <div className={styles.serviceDetailNav}>
            <button
              type="button"
              className={`${styles.serviceDetailNavButton} ${activeServicePanel === "summary" ? styles.serviceDetailNavButtonActive : ""}`}
              onClick={() => setActiveServicePanel("summary")}
              aria-pressed={activeServicePanel === "summary"}
            >
              Overview
            </button>
            <button
              type="button"
              className={`${styles.serviceDetailNavButton} ${activeServicePanel === "storage" ? styles.serviceDetailNavButtonActive : ""}`}
              onClick={() => setActiveServicePanel("storage")}
              aria-pressed={activeServicePanel === "storage"}
            >
              Storage
            </button>
            <button
              type="button"
              className={`${styles.serviceDetailNavButton} ${activeServicePanel === "collections" ? styles.serviceDetailNavButtonActive : ""}`}
              onClick={() => setActiveServicePanel("collections")}
              aria-pressed={activeServicePanel === "collections"}
            >
              Collections
            </button>
          </div>

          <div className={styles.serviceDetailPanel}>
            {activeServicePanel === "summary" ? (
              <div className={styles.serviceSection}>
                <h3 className={styles.serviceSectionTitle}>Database Summary</h3>
                <div className={styles.serviceMetaGrid}>
                  {serviceDetails?.service === "database" ? (
                    <>
                      <div className={styles.serviceMetaCard}>
                        <p className={styles.serviceMetaLabel}>Total records</p>
                        <p className={styles.serviceMetaValue}>{serviceDetails.database.totalRecords}</p>
                      </div>
                      <div className={styles.serviceMetaCard}>
                        <p className={styles.serviceMetaLabel}>Collections</p>
                        <p className={styles.serviceMetaValue}>{serviceDetails.database.totalCollections}</p>
                      </div>
                    </>
                  ) : null}
                  <div className={styles.serviceMetaCard}>
                    <p className={styles.serviceMetaLabel}>Schema name</p>
                    <p className={styles.serviceMetaValue}>{project.schemaName}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {activeServicePanel === "storage" ? (
              <div className={styles.serviceSection}>
                <h3 className={styles.serviceSectionTitle}>Storage</h3>
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
            ) : null}

            {activeServicePanel === "collections" ? (
              <div className={styles.serviceSection}>
                <h3 className={styles.serviceSectionTitle}>Collections</h3>
                {serviceDetails?.service === "database" && serviceDetails.database.collections.length > 0 ? (
                  <div className={styles.analyticsRouteList}>
                    {serviceDetails.database.collections.slice(0, 6).map((collection) => (
                      <div key={collection.name} className={styles.analyticsRouteItem}>
                        <div>
                          <p className={styles.createFormTitle}>{collection.name}</p>
                        </div>
                        <div className={styles.analyticsRouteStats}>
                          <span>{collection.count} rows</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.projectCardDate}>No collections have been created yet.</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    if (selectedKnownServiceId === "api") {
      const selectedApiKey = selectedApiKeyId ? apiKeys.find((item) => item.id === selectedApiKeyId) ?? null : null;

      return (
        <div className={styles.serviceDetailSplit}>
          <div className={styles.serviceDetailNav}>
            <button
              type="button"
              className={`${styles.serviceDetailNavButton} ${activeServicePanel === "summary" ? styles.serviceDetailNavButtonActive : ""}`}
              onClick={() => setActiveServicePanel("summary")}
              aria-pressed={activeServicePanel === "summary"}
            >
              Overview
            </button>
            <button
              type="button"
              className={`${styles.serviceDetailNavButton} ${activeServicePanel === "endpoints" ? styles.serviceDetailNavButtonActive : ""}`}
              onClick={() => setActiveServicePanel("endpoints")}
              aria-pressed={activeServicePanel === "endpoints"}
            >
              Endpoints
            </button>
            <button
              type="button"
              className={`${styles.serviceDetailNavButton} ${activeServicePanel === "connect" ? styles.serviceDetailNavButtonActive : ""}`}
              onClick={() => setActiveServicePanel("connect")}
              aria-pressed={activeServicePanel === "connect"}
            >
              Connect
            </button>
            <button
              type="button"
              className={`${styles.serviceDetailNavButton} ${activeServicePanel === "keys" ? styles.serviceDetailNavButtonActive : ""}`}
              onClick={() => setActiveServicePanel("keys")}
              aria-pressed={activeServicePanel === "keys"}
            >
              Keys
            </button>
          </div>

          <div className={styles.serviceDetailPanel}>
            {activeServicePanel === "summary" ? (
              <div className={styles.serviceSection}>
                <h3 className={styles.serviceSectionTitle}>API access state</h3>
                <div className={styles.serviceMetaGrid}>
                  <div className={styles.serviceMetaCard}>
                    <p className={styles.serviceMetaLabel}>Active API keys</p>
                    <p className={styles.serviceMetaValue}>{serviceDetails?.service === "api" ? serviceDetails.api.activeApiKeys : apiKeys.length}</p>
                  </div>
                  <div className={styles.serviceMetaCard}>
                    <p className={styles.serviceMetaLabel}>Project key</p>
                    <p className={styles.serviceMetaValue}>{project.key}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {activeServicePanel === "endpoints" ? (
              <div className={styles.serviceSection}>
                <h3 className={styles.serviceSectionTitle}>Endpoints</h3>
                <div className={styles.endpointList}>
                  <code className={styles.endpointItem}>POST {authBasePath}/register</code>
                  <code className={styles.endpointItem}>POST {authBasePath}/login</code>
                  <code className={styles.endpointItem}>GET {recordsBasePath}</code>
                  <code className={styles.endpointItem}>POST {recordsBasePath}</code>
                </div>
              </div>
            ) : null}

            {activeServicePanel === "connect" ? (
              <>
                <div className={styles.serviceSection}>
                  <h3 className={styles.serviceSectionTitle}>Connect your frontend</h3>
                  <div className={styles.apiConfigCard}>
                    <div className={styles.apiConfigRow}>
                      <div>
                        <p className={styles.serviceMetaLabel}>Project URL</p>
                        <p className={styles.serviceMetaValue}>{publicBaseUrl}/api/v1/{project.key}</p>
                      </div>
                      <button
                        type="button"
                        className={styles.serviceActionButton}
                        onClick={() => void copySnippet("project-url", `${publicBaseUrl}/api/v1/${project.key}`)}
                      >
                        {copiedSnippet === "project-url" ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <div className={styles.apiConfigRow}>
                      <div>
                        <p className={styles.serviceMetaLabel}>Project API Key</p>
                        <p className={styles.serviceMetaValue}>{apiKeySecret ? apiKeySecret : "Generate one below"}</p>
                      </div>
                      <button
                        type="button"
                        className={styles.serviceActionButton}
                        onClick={() => void copySnippet("api-key", apiKeySecret || "")}
                        disabled={!apiKeySecret}
                      >
                        {copiedSnippet === "api-key" ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className={styles.serviceSection}>
                  <h3 className={styles.serviceSectionTitle}>Quick request snippet</h3>
                  <div className={styles.connectSnippetBlock}>
                    <div className={styles.connectSnippetHeader}>
                      <p className={styles.createFormTitle}>records create request</p>
                      <button
                        type="button"
                        className={styles.serviceActionButton}
                        onClick={() => void copySnippet("records", recordsSnippet)}
                      >
                        {copiedSnippet === "records" ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <pre className={styles.connectSnippetCode}>{recordsSnippet}</pre>
                  </div>
                </div>
              </>
            ) : null}

            {activeServicePanel === "keys" ? (
              <div className={styles.serviceDetailSplit}>
                <div className={styles.serviceDetailNav}>
                  <div className={styles.serviceSectionTitle}>API Keys</div>
                  <div className={styles.apiKeyList}>
                    {apiKeys.length === 0 ? (
                      <p className={styles.projectCardDate}>No API keys yet for this project.</p>
                    ) : (
                      apiKeys.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`${styles.apiKeyItem} ${selectedApiKeyId === item.id ? styles.serviceDetailNavButtonActive : ""}`}
                          onClick={() => setSelectedApiKeyId(item.id)}
                        >
                          <div>
                            <p className={styles.createFormTitle}>{item.name}</p>
                            <p className={styles.projectCardDate}>{item.keyPrefix}...</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className={styles.serviceDetailPanel}>
                  {selectedApiKey ? (
                    <div className={styles.serviceSection}>
                      <h3 className={styles.serviceSectionTitle}>{selectedApiKey.name}</h3>
                      <div className={styles.serviceMetaGrid}>
                        <div className={styles.serviceMetaCard}>
                          <p className={styles.serviceMetaLabel}>Prefix</p>
                          <p className={styles.serviceMetaValue}>{selectedApiKey.keyPrefix}</p>
                        </div>
                        <div className={styles.serviceMetaCard}>
                          <p className={styles.serviceMetaLabel}>Status</p>
                          <p className={styles.serviceMetaValue}>{selectedApiKey.revokedAt ? "Revoked" : "Active"}</p>
                        </div>
                        <div className={styles.serviceMetaCard}>
                          <p className={styles.serviceMetaLabel}>Created</p>
                          <p className={styles.serviceMetaValue}>
                            {new Date(selectedApiKey.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <div className={styles.serviceMetaCard}>
                          <p className={styles.serviceMetaLabel}>Scopes</p>
                          <p className={styles.serviceMetaValue}>
                            {selectedApiKey.scopes.length ? selectedApiKey.scopes.join(", ") : "Full legacy access"}
                          </p>
                        </div>
                      </div>

                      <div className={styles.modalActions}>
                        {sessionApiKeySecrets[selectedApiKey.id] ? (
                          <button
                            type="button"
                            className={styles.serviceActionButton}
                            onClick={() => void copySnippet(`full-${selectedApiKey.id}`, sessionApiKeySecrets[selectedApiKey.id])}
                          >
                            {copiedSnippet === `full-${selectedApiKey.id}` ? "Copied" : "Copy full key"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={styles.serviceActionButton}
                            onClick={() => void copySnippet(`prefix-${selectedApiKey.id}`, `${selectedApiKey.keyPrefix}...`)}
                          >
                            {copiedSnippet === `prefix-${selectedApiKey.id}` ? "Copied" : "Copy prefix"}
                          </button>
                        )}
                        {!selectedApiKey.revokedAt ? (
                          <button
                            type="button"
                            className={styles.serviceActionButton}
                            onClick={() => void revokeApiKey(selectedApiKey.id)}
                            disabled={apiBusy}
                          >
                            Revoke
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={styles.serviceActionButton}
                            onClick={() => void deleteApiKey(selectedApiKey.id)}
                            disabled={apiBusy}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className={styles.projectCardDate}>Select a key on the left to see more details.</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    if (selectedKnownServiceId === "analytics") {
      const selectedRoute = selectedRouteKey ? topRoutes.find((route) => route.key === selectedRouteKey) ?? null : null;

      return (
        <div className={styles.serviceDetailSplit}>
          <div className={styles.serviceDetailNav}>
            <button
              type="button"
              className={`${styles.serviceDetailNavButton} ${activeServicePanel === "metrics" ? styles.serviceDetailNavButtonActive : ""}`}
              onClick={() => setActiveServicePanel("metrics")}
              aria-pressed={activeServicePanel === "metrics"}
            >
              Metrics
            </button>
            <button
              type="button"
              className={`${styles.serviceDetailNavButton} ${activeServicePanel === "routes" ? styles.serviceDetailNavButtonActive : ""}`}
              onClick={() => setActiveServicePanel("routes")}
              aria-pressed={activeServicePanel === "routes"}
            >
              Routes
            </button>
          </div>

          <div className={styles.serviceDetailPanel}>
            {activeServicePanel === "metrics" ? (
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
            ) : null}

            {activeServicePanel === "routes" ? (
              <div className={styles.serviceDetailSplit}>
                <div className={styles.serviceDetailNav}>
                  {topRoutes.length === 0 ? (
                    <p className={styles.projectCardDate}>No tracked traffic yet in this process.</p>
                  ) : (
                    <div className={styles.analyticsRouteList}>
                      {topRoutes.map((route) => (
                        <button
                          key={route.key}
                          type="button"
                          className={`${styles.apiKeyItem} ${selectedRouteKey === route.key ? styles.serviceDetailNavButtonActive : ""}`}
                          onClick={() => setSelectedRouteKey(route.key)}
                        >
                          <div>
                            <p className={styles.createFormTitle}>{route.key}</p>
                            <p className={styles.projectCardDate}>Avg {route.avgDurationMs} ms</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.serviceDetailPanel}>
                  {selectedRoute ? (
                    <div className={styles.serviceSection}>
                      <h3 className={styles.serviceSectionTitle}>{selectedRoute.key}</h3>
                      <div className={styles.serviceMetaGrid}>
                        <div className={styles.serviceMetaCard}>
                          <p className={styles.serviceMetaLabel}>Requests</p>
                          <p className={styles.serviceMetaValue}>{selectedRoute.count}</p>
                        </div>
                        <div className={styles.serviceMetaCard}>
                          <p className={styles.serviceMetaLabel}>Errors</p>
                          <p className={styles.serviceMetaValue}>{selectedRoute.errorCount}</p>
                        </div>
                        <div className={styles.serviceMetaCard}>
                          <p className={styles.serviceMetaLabel}>Avg duration</p>
                          <p className={styles.serviceMetaValue}>{selectedRoute.avgDurationMs} ms</p>
                        </div>
                        <div className={styles.serviceMetaCard}>
                          <p className={styles.serviceMetaLabel}>Error rate</p>
                          <p className={styles.serviceMetaValue}>{selectedRoute.errorRate}%</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className={styles.projectCardDate}>Select a route on the left to inspect it.</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    if (selectedKnownServiceId === "logs") {
      return (
        <div className={styles.serviceSection}>
          <h3 className={styles.serviceSectionTitle}>Recent Audit Logs</h3>
          {auditLogs.length === 0 ? (
            <p className={styles.projectCardDate}>No audit events have been recorded yet.</p>
          ) : (
            <div className={styles.analyticsRouteList}>
              {auditLogs.map((log) => (
                <div key={log.id} className={styles.analyticsRouteItem}>
                  <div>
                    <p className={styles.createFormTitle}>{log.action}</p>
                    <p className={styles.projectCardDate}>
                      {log.resourceType ?? "resource"}
                      {log.resourceId ? `:${log.resourceId}` : ""}
                    </p>
                  </div>
                  <div className={styles.analyticsRouteStats}>
                    <span>{log.status}</span>
                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (selectedKnownServiceId === "usage") {
      return (
        <div className={styles.serviceDetailSplit}>
          <div className={styles.serviceDetailPanel}>
            <div className={styles.serviceSection}>
              <h3 className={styles.serviceSectionTitle}>Usage Summary</h3>
              <div className={styles.serviceMetaGrid}>
                <div className={styles.serviceMetaCard}>
                  <p className={styles.serviceMetaLabel}>Total events</p>
                  <p className={styles.serviceMetaValue}>{usageSummary?.totalEvents ?? 0}</p>
                </div>
                <div className={styles.serviceMetaCard}>
                  <p className={styles.serviceMetaLabel}>Total quantity</p>
                  <p className={styles.serviceMetaValue}>{usageSummary?.totalQuantity ?? 0}</p>
                </div>
              </div>
            </div>

            <div className={styles.serviceSection}>
              <h3 className={styles.serviceSectionTitle}>By Metric</h3>
              {usageSummary?.byMetric.length ? (
                <div className={styles.analyticsRouteList}>
                  {usageSummary.byMetric.map((metric) => (
                    <div key={metric.metric} className={styles.analyticsRouteItem}>
                      <div>
                        <p className={styles.createFormTitle}>{metric.metric}</p>
                      </div>
                      <div className={styles.analyticsRouteStats}>
                        <span>{metric.events} events</span>
                        <span>{metric.quantity} quantity</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.projectCardDate}>No usage aggregates yet.</p>
              )}
            </div>

            <div className={styles.serviceSection}>
              <h3 className={styles.serviceSectionTitle}>Recent Usage Events</h3>
              {usageLogs.length === 0 ? (
                <p className={styles.projectCardDate}>No usage events have been recorded yet.</p>
              ) : (
                <div className={styles.analyticsRouteList}>
                  {usageLogs.map((item) => (
                    <div key={item.id} className={styles.analyticsRouteItem}>
                      <div>
                        <p className={styles.createFormTitle}>{item.metric}</p>
                        <p className={styles.projectCardDate}>Quantity: {item.quantity}</p>
                      </div>
                      <div className={styles.analyticsRouteStats}>
                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={styles.consoleShell}>
      <aside className={styles.consoleSidebar}>
        <div className={styles.sidebarBrand}>
          <span className={styles.logoMark}>B</span>
          <div>
            <p className={styles.logoText}>Buildstack</p>
            <p className={styles.sidebarMeta}>{project?.displayName ?? "Project Cluster"}</p>
          </div>
        </div>

        <nav className={styles.sidebarNav}>
          <Link href={`/projects/${projectId}`} className={`${styles.sidebarNavItem} ${!serviceId ? styles.sidebarNavItemActive : ""}`}>
            Overview
          </Link>
          <Link href={`/projects/${projectId}/database`} className={`${styles.sidebarNavItem} ${serviceId === "database" ? styles.sidebarNavItemActive : ""}`}>
            Database
          </Link>
          <Link href={`/projects/${projectId}/auth`} className={`${styles.sidebarNavItem} ${serviceId === "auth" ? styles.sidebarNavItemActive : ""}`}>
            Authentication
          </Link>
          <Link href={`/projects/${projectId}/api`} className={`${styles.sidebarNavItem} ${serviceId === "api" ? styles.sidebarNavItemActive : ""}`}>
            API
          </Link>
          <Link href={`/projects/${projectId}/analytics`} className={`${styles.sidebarNavItem} ${serviceId === "analytics" ? styles.sidebarNavItemActive : ""}`}>
            Analytics
          </Link>
          <Link href={`/projects/${projectId}/logs`} className={`${styles.sidebarNavItem} ${serviceId === "logs" ? styles.sidebarNavItemActive : ""}`}>
            Logs
          </Link>
          <Link href={`/projects/${projectId}/usage`} className={`${styles.sidebarNavItem} ${serviceId === "usage" ? styles.sidebarNavItemActive : ""}`}>
            Usage
          </Link>
          <Link href={`/projects/${projectId}/storage`} className={`${styles.sidebarNavItem} ${serviceId === "storage" ? styles.sidebarNavItemActive : ""}`}>
            Storage
          </Link>
          <Link href={`/projects/${projectId}/sql`} className={styles.sidebarNavItem}>
            SQL Editor
          </Link>
          <Link href={`/projects/${projectId}/settings`} className={styles.sidebarNavItem}>
            Settings
          </Link>
          <Link href={`/docs/connect-app?projectId=${projectId}`} className={styles.sidebarNavItem}>
            Documentation
          </Link>
        </nav>
      </aside>

      <div className={styles.consoleMain}>
        <header className={styles.consoleTopbar}>
          <p className={styles.topbarPath}>Projects &gt; {project?.displayName ?? "Project"} {serviceId ? `&gt; ${serviceId}` : ""}</p>
          <Link href="/" className={styles.secondaryButtonLink}>Back to projects</Link>
        </header>

        <main className={styles.consoleContent}>
          <div className={styles.dashHeader}>
            <div>
              <h1 className={styles.dashTitle}>
                {isApiView ? "API Settings" : serviceId ? `${selectedService?.name ?? "Service"}` : "Service Hub"}
              </h1>
              <p className={styles.dashSub}>
                {isApiView
                  ? "Manage project keys and connection details."
                  : serviceId
                  ? "Essential service details for this project."
                  : "Open a service to manage only what matters."}
              </p>
            </div>
            {isApiView ? (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => {
                  const panel = document.getElementById("api-keys");
                  if (panel) {
                    panel.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
              >
                Generate New Key
              </button>
            ) : null}
          </div>

          {loading ? (
            <p className={styles.loadingText}>Loading services...</p>
          ) : error ? (
            <p className={styles.errorBanner}>{error}</p>
          ) : (
            <>
                {!serviceId ? (
                  <section className={styles.serviceConsole}>
                    <div className={styles.serviceDetailSplit}>
                      <div className={styles.serviceDetailNav}>
                        {services.map((service) => {
                          const icon = isKnownServiceId(service.id) ? SERVICE_ICONS[service.id] : "::";
                          const color = isKnownServiceId(service.id) ? SERVICE_COLORS[service.id] : "#6b7280";
                          return (
                            <button
                              key={service.id}
                              type="button"
                              className={`${styles.serviceCardButton} ${selectedOverviewService?.id === service.id ? styles.serviceCardButtonActive : ""}`}
                              style={{ "--service-color": color } as React.CSSProperties}
                              onClick={() => setSelectedOverviewServiceId(service.id)}
                              aria-pressed={selectedOverviewService?.id === service.id}
                            >
                              <div className={styles.serviceCardIcon}>{icon}</div>
                              <div className={styles.serviceCardBody}>
                                <h2 className={styles.serviceCardName}>{service.name}</h2>
                              </div>
                              <span className={styles.serviceCardCta}>Open</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className={styles.serviceDetailPanel}>
                        {selectedOverviewService ? (
                          <>
                            <header className={styles.serviceConsoleHeader}>
                              <h2>
                                {selectedOverviewService.id && selectedOverviewKnownServiceId ? SERVICE_ICONS[selectedOverviewKnownServiceId] : "::"} {selectedOverviewService.name}
                              </h2>
                              <p>{selectedOverviewService.status === "available" ? "Available" : "Coming soon"}</p>
                            </header>

                            <div className={styles.serviceMetaGrid}>
                              <div className={styles.serviceMetaCard}>
                                <p className={styles.serviceMetaLabel}>Service</p>
                                <p className={styles.serviceMetaValue}>{selectedOverviewService.name}</p>
                              </div>
                              <div className={styles.serviceMetaCard}>
                                <p className={styles.serviceMetaLabel}>Description</p>
                                <p className={styles.serviceMetaValue}>{selectedOverviewService.description}</p>
                              </div>
                              <div className={styles.serviceMetaCard}>
                                <p className={styles.serviceMetaLabel}>Status</p>
                                <p className={styles.serviceMetaValue}>{selectedOverviewService.status === "available" ? "Live" : "Planned"}</p>
                              </div>
                            </div>

                            <div className={styles.serviceSection}>
                              <h3 className={styles.serviceSectionTitle}>Next step</h3>
                              <p className={styles.projectCardDate}>
                                {selectedOverviewService.id === "api"
                                  ? "Open the API panel to create keys or copy the connection details."
                                  : selectedOverviewService.id === "database"
                                  ? "Open the database page to inspect collections and storage."
                                  : selectedOverviewService.id === "auth"
                                  ? "Open auth to review users and endpoints."
                                  : "Open the service page to continue."}
                              </p>
                              <Link href={getServiceHref(projectId, selectedOverviewService.id)} className={styles.openProjectBtn}>
                                Open {selectedOverviewService.name}
                              </Link>
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </section>
                ) : null}

              {selectedService && selectedKnownServiceId ? (
                <section className={styles.serviceConsole}>
                  <header className={styles.serviceConsoleHeader}>
                    <h2>{SERVICE_ICONS[selectedKnownServiceId]} {selectedService.name}</h2>
                    <p>{selectedService.status === "available" ? "Available" : "Coming soon"}</p>
                  </header>

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

                      <div className={styles.serviceMetaGrid}>
                        <div className={styles.serviceMetaCard}>
                          <p className={styles.serviceMetaLabel}>Scope presets</p>
                          <p className={styles.projectCardDate}>
                            Leave all unchecked for legacy full-access behavior, or choose explicit scopes.
                          </p>
                          <div className={styles.modalActions}>
                            {API_KEY_SCOPES.map((scope) => (
                              <label key={scope} className={styles.projectCardDate}>
                                <input
                                  type="checkbox"
                                  checked={apiKeyScopes.includes(scope)}
                                  onChange={() => toggleApiKeyScope(scope)}
                                />{" "}
                                {scope}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      {apiKeySecret ? (
                        <div className={styles.apiKeyReveal}>
                          <p className={styles.projectCardDate}>Copy this key now. Full secret is shown only once for security.</p>
                          <code className={styles.apiKeyValue}>{apiKeySecret}</code>
                        </div>
                      ) : null}

                      <p className={styles.projectCardDate}>
                        Existing keys show only a prefix. Full secrets are only available when the key is created in this browser session.
                      </p>
                      <p className={styles.projectCardDate}>Revoke a key first, then delete it permanently if no longer needed.</p>

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
                                <p className={styles.projectCardDate}>
                                  Status: {item.revokedAt ? "Revoked" : "Active"}
                                  {item.revokedAt
                                    ? ` (${new Date(item.revokedAt).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })})`
                                    : ""}
                                </p>
                                <p className={styles.projectCardDate}>
                                  Scopes: {item.scopes.length ? item.scopes.join(", ") : "Full legacy access"}
                                </p>
                              </div>
                              <div className={styles.serviceActionRow}>
                                {sessionApiKeySecrets[item.id] ? (
                                  <button
                                    type="button"
                                    className={styles.serviceActionButton}
                                    onClick={() => void copySnippet(`full-${item.id}`, sessionApiKeySecrets[item.id])}
                                  >
                                    {copiedSnippet === `full-${item.id}` ? "Copied" : "Copy full key"}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className={styles.serviceActionButton}
                                    onClick={() => void copySnippet(`prefix-${item.id}`, `${item.keyPrefix}...`)}
                                  >
                                    {copiedSnippet === `prefix-${item.id}` ? "Copied" : "Copy prefix"}
                                  </button>
                                )}
                                {!item.revokedAt ? (
                                  <button
                                    type="button"
                                    className={styles.serviceActionButton}
                                    onClick={() => void revokeApiKey(item.id)}
                                    disabled={apiBusy}
                                  >
                                    Revoke
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className={styles.serviceActionButton}
                                    onClick={() => void deleteApiKey(item.id)}
                                    disabled={apiBusy}
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
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
                    <h2>Project Overview</h2>
                    <p>Open a service to manage it.</p>
                  </header>
                  <div className={styles.serviceSection}>
                    <h3 className={styles.serviceSectionTitle}>Quick Actions</h3>
                    <Link href={`/projects/${projectId}/api#api-connect`} className={styles.openProjectBtn}>
                      Open API connect
                    </Link>
                  </div>
                </section>
              ) : null}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
