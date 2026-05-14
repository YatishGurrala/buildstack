import { coreDb } from "@/core/db/core";
import type { AuditLogInput } from "@/modules/audit-log/audit-log.types";
import type { Prisma } from "@prisma/client";

export class AuditLogRepository {
  async create(input: AuditLogInput): Promise<void> {
    await coreDb.auditLog.create({
      data: {
        action: input.action,
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        projectId: input.projectId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        status: input.status,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async listByProject(projectId: string, limit: number) {
    return coreDb.auditLog.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}

export const auditLogRepository = new AuditLogRepository();
