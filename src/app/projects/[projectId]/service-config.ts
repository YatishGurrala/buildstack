export const PROJECT_SERVICE_IDS = ["auth", "database", "api", "analytics", "storage"] as const;

export type ProjectServiceId = (typeof PROJECT_SERVICE_IDS)[number];

export function isProjectServiceId(value: string): value is ProjectServiceId {
  return PROJECT_SERVICE_IDS.includes(value as ProjectServiceId);
}

export const SERVICE_ICONS: Record<ProjectServiceId, string> = {
  auth: "🔐",
  database: "🗄️",
  api: "⚡",
  analytics: "📊",
  storage: "🛠️",
};

export const SERVICE_COLORS: Record<ProjectServiceId, string> = {
  auth: "#3b82f6",
  database: "#10b981",
  api: "#f59e0b",
  analytics: "#8b5cf6",
  storage: "#64748b",
};

export const SERVICE_ACTIONS: Record<ProjectServiceId, string[]> = {
  auth: ["Manage providers", "View app users", "Configure token behavior"],
  database: ["Inspect schema", "Review tables", "Check storage usage"],
  api: ["Generate API key", "Inspect auth endpoints", "Inspect records endpoints"],
  analytics: ["Review request metrics", "Inspect error-rate alerts", "Export operational data"],
  storage: ["Plan buckets", "Review upload rules", "Prepare asset workflow"],
};

export const SERVICE_INSIGHTS: Record<
  ProjectServiceId,
  Array<{ label: string; value: string }>
> = {
  auth: [
    { label: "Runtime status", value: "Running" },
    { label: "End-user auth", value: "Register, login, logout endpoints are live" },
    { label: "Project isolation", value: "Users and sessions are stored in this project's schema" },
  ],
  database: [
    { label: "Runtime status", value: "Running" },
    { label: "Storage model", value: "Project-isolated Postgres schema" },
    { label: "Managed tables", value: "app_users, app_sessions, records" },
  ],
  api: [
    { label: "Runtime status", value: "Running" },
    { label: "Authentication", value: "X-Api-Key for project access" },
    { label: "Routes", value: "Auth and records endpoints are live" },
  ],
  analytics: [
    { label: "Runtime status", value: "Running" },
    { label: "Signals", value: "Request metrics and error-rate monitoring" },
    { label: "Visibility", value: "Operational metrics available from the core analytics surface" },
  ],
  storage: [
    { label: "Runtime status", value: "Not enabled" },
    { label: "Planned scope", value: "Managed asset storage per project" },
    { label: "Current state", value: "Reserved for a future implementation" },
  ],
};

export const SERVICE_CONFIGURATION: Record<ProjectServiceId, string[]> = {
  auth: [
    "Project-scoped app users are persisted inside the project schema.",
    "Sessions are revocable and tied to issued user tokens.",
    "Dashboard sign-in remains separate from project app-user authentication.",
  ],
  database: [
    "Each project is provisioned into its own schema inside projects_db.",
    "Records are stored as JSONB for flexible internal-app data models.",
    "Schema usage is tracked and surfaced back on the dashboard.",
  ],
  api: [
    "Project keys are generated and revoked from the dashboard UI.",
    "External clients use /api/v1/[projectKey]/auth/* and /records endpoints.",
    "Requests carry CSRF, rate-limit, and request-id protections on the platform side.",
  ],
  analytics: [
    "Request logs are emitted through the platform proxy layer.",
    "Error-rate alerts are emitted from the shared monitoring utilities.",
    "This surface is available, but detailed drill-down UI still needs expansion.",
  ],
  storage: [
    "No buckets or upload APIs are provisioned yet.",
    "This card is present so the project service map is complete.",
    "File handling should stay out of scope until the storage backend is added.",
  ],
};