import { HttpError } from "@/lib/http";

import {
  type ApiKeyScope,
  type ProjectPermission,
  type ProjectRole,
  PROJECT_ROLE_PERMISSIONS,
} from "@/core/rbac/permissions";

export function hasProjectPermission(role: ProjectRole, permission: ProjectPermission): boolean {
  return PROJECT_ROLE_PERMISSIONS[role].has(permission);
}

export function assertProjectPermission(role: ProjectRole, permission: ProjectPermission): void {
  if (hasProjectPermission(role, permission)) {
    return;
  }

  throw new HttpError(403, `Missing permission: ${permission}`, "PERMISSION_DENIED");
}

export function hasApiKeyScope(
  scopes: readonly string[] | null | undefined,
  requiredScope: ApiKeyScope,
): boolean {
  if (!scopes || scopes.length === 0) {
    return true;
  }

  return scopes.includes(requiredScope);
}

export function assertApiKeyScope(
  scopes: readonly string[] | null | undefined,
  requiredScope: ApiKeyScope,
): void {
  if (hasApiKeyScope(scopes, requiredScope)) {
    return;
  }

  throw new HttpError(403, `Missing API key scope: ${requiredScope}`, "INSUFFICIENT_SCOPE");
}
