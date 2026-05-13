import { coreDb } from "@/core/db/core";
import type { UsageLogInput } from "@/modules/usage-log/usage-log.types";
import type { Prisma } from "@prisma/client";

export class UsageLogRepository {
  async create(input: UsageLogInput): Promise<void> {
    await coreDb.usageLog.create({
      data: {
        metric: input.metric,
        quantity: input.quantity ?? 1,
        projectId: input.projectId,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async listByProject(projectId: string, limit: number) {
    return coreDb.usageLog.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async aggregateByProject(projectId: string) {
    const [totalEvents, metricGroups] = await Promise.all([
      coreDb.usageLog.count({ where: { projectId } }),
      coreDb.usageLog.groupBy({
        by: ["metric"],
        where: { projectId },
        _count: { _all: true },
        _sum: { quantity: true },
      }),
    ]);

    return {
      totalEvents,
      byMetric: metricGroups.map((item) => ({
        metric: item.metric,
        events: item._count._all,
        quantity: item._sum.quantity ?? 0,
      })),
    };
  }
}

export const usageLogRepository = new UsageLogRepository();
