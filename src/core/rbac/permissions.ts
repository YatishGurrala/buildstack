export const PROJECT_ROLES = ["owner", "admin", "member", "viewer"] as const;

export type ProjectRole = (typeof PROJECT_ROLES)[number];

export const PROJECT_PERMISSIONS = [
  "manage_project",
  "manage_members",
  "manage_api_keys",
  "read_records",
  "write_records",
  "delete_records",
  "view_audit_logs",
] as const;

export type ProjectPermission = (typeof PROJECT_PERMISSIONS)[number];

const ownerPermissions: ReadonlySet<ProjectPermission> = new Set(PROJECT_PERMISSIONS);
const adminPermissions: ReadonlySet<ProjectPermission> = new Set([
  "manage_members",
  "manage_api_keys",
  "read_records",
  "write_records",
  "delete_records",
  "view_audit_logs",
]);
const memberPermissions: ReadonlySet<ProjectPermission> = new Set([
  "read_records",
  "write_records",
]);
const viewerPermissions: ReadonlySet<ProjectPermission> = new Set(["read_records"]);

export const PROJECT_ROLE_PERMISSIONS: Readonly<Record<ProjectRole, ReadonlySet<ProjectPermission>>> = {
  owner: ownerPermissions,
  admin: adminPermissions,
  member: memberPermissions,
  viewer: viewerPermissions,
};

export const API_KEY_SCOPES = [
  "records:read",
  "records:write",
  "records:delete",
  "auth:write",
] as const;

// CORE_API_KEY_SCOPES lists the built-in scopes for reference/documentation.
// New products define their own scopes using the "namespace:action" convention
// (e.g. "cms:read", "mail:send") without modifying this file.
export const CORE_API_KEY_SCOPES = API_KEY_SCOPES;

// ApiKeyScope is intentionally an open string type so separate products can
// introduce their own scopes without touching core.
export type ApiKeyScope = string;
