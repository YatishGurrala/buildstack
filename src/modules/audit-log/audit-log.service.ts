import { auditLogRepository } from "@/modules/audit-log/audit-log.repository";
import { safeWrite } from "@/modules/shared/safe-write";
import type {
  AuditLogEntry,
  AuditLogInput,
  AuditLogQuery,
} from "@/modules/audit-log/audit-log.types";

const SENSITIVE_KEY_PATTERN = /password|secret|token|authorization|cookie|api[-_]?key/i;

function sanitizeMetadataValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeMetadataValue);
  }

  if (value && typeof value === "object") {
    return sanitizeMetadata(value as Record<string, unknown>);
  }

  return value;
}

export function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  return Object.entries(metadata).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      return acc;
    }

    acc[key] = sanitizeMetadataValue(value);
    return acc;
  }, {});
}

export class AuditLogService {
  async log(input: AuditLogInput): Promise<void> {
    await safeWrite(
      () =>
        auditLogRepository.create({
        ...input,
        metadata: input.metadata ? sanitizeMetadata(input.metadata) : undefined,
      }),
      {
        area: "audit",
        action: input.action,
      },
    );
  }

  async listForProject(projectId: string, query: AuditLogQuery = {}): Promise<AuditLogEntry[]> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const logs = await auditLogRepository.listByProject(projectId, limit);
    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      status: log.status,
      actorUserId: log.actorUserId,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      metadata: (log.metadata as Record<string, unknown> | null) ?? null,
      createdAt: log.createdAt.toISOString(),
    }));
  }
}

export const auditLogService = new AuditLogService();
