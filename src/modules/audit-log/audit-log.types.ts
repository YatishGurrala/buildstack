export const AUDIT_ACTIONS = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "CREATE_API_KEY",
  "REVOKE_API_KEY",
  "CREATE_RECORD",
  "UPDATE_RECORD",
  "DELETE_RECORD",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditStatus = "success" | "failed";

export type AuditLogInput = {
  action: AuditAction;
  actorUserId?: string;
  organizationId?: string;
  projectId?: string;
  resourceType?: string;
  resourceId?: string;
  status: AuditStatus;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

export type AuditLogQuery = {
  limit?: number;
};

export type AuditLogEntry = {
  id: string;
  action: string;
  status: string;
  actorUserId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};
