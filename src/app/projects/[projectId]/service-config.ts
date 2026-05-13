// Central list of project services shown in the project dashboard.
// Keep this aligned with the service routes under src/app/projects/[projectId].
export const PROJECT_SERVICE_IDS = ["auth", "database", "api", "analytics", "logs", "usage", "storage"] as const;

export type ProjectServiceId = (typeof PROJECT_SERVICE_IDS)[number];

export function isProjectServiceId(value: string): value is ProjectServiceId {
  return PROJECT_SERVICE_IDS.includes(value as ProjectServiceId);
}

export const SERVICE_ICONS: Record<ProjectServiceId, string> = {
  auth: "🔐",
  database: "🗄️",
  api: "⚡",
  analytics: "📊",
  logs: "🧾",
  usage: "📈",
  storage: "🛠️",
};

export const SERVICE_COLORS: Record<ProjectServiceId, string> = {
  auth: "#3b82f6",
  database: "#10b981",
  api: "#f59e0b",
  analytics: "#8b5cf6",
  logs: "#0ea5e9",
  usage: "#14b8a6",
  storage: "#64748b",
};

// Short action labels that describe what each service page is for.
export const SERVICE_ACTIONS: Record<ProjectServiceId, string[]> = {
  auth: ["Manage providers", "View app users", "Configure token behavior"],
  database: ["Inspect schema", "Review tables", "Check storage usage"],
  api: ["Generate API key", "Inspect auth endpoints", "Inspect records endpoints"],
  analytics: ["Review request metrics", "Inspect error-rate alerts", "Export operational data"],
  logs: ["Inspect audit events", "Filter by recent changes", "Investigate key operations"],
  usage: ["Track request volume", "Inspect metric breakdown", "Review operation trends"],
  storage: ["Plan buckets", "Review upload rules", "Prepare asset workflow"],
};

// Compact service summary text used by the project dashboard.
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
  logs: [
    { label: "Runtime status", value: "Running" },
    { label: "Source", value: "Project AuditLog events" },
    { label: "Coverage", value: "Auth and API key lifecycle actions" },
  ],
  usage: [
    { label: "Runtime status", value: "Running" },
    { label: "Source", value: "Project UsageLog metrics" },
    { label: "Coverage", value: "Auth and records usage events" },
  ],
  storage: [
    { label: "Runtime status", value: "Not enabled" },
    { label: "Planned scope", value: "Managed asset storage per project" },
    { label: "Current state", value: "Reserved for a future implementation" },
  ],
};

// Configuration notes for each service. These are intentionally short because the UI now stays minimal.
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
  logs: [
    "Audit events are captured as best-effort writes and available through core routes.",
    "Sensitive fields are scrubbed before persistence.",
    "This view is project-scoped and membership-protected.",
  ],
  usage: [
    "Usage metrics are captured as best-effort writes and available through core routes.",
    "Counts are grouped by metric for a quick operational view.",
    "This view is project-scoped and membership-protected.",
  ],
  storage: [
    "No buckets or upload APIs are provisioned yet.",
    "This card is present so the project service map is complete.",
    "File handling should stay out of scope until the storage backend is added.",
  ],
};