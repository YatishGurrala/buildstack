import { usageLogRepository } from "@/modules/usage-log/usage-log.repository";
import { safeWrite } from "@/modules/shared/safe-write";
import type {
  UsageLogEntry,
  UsageLogInput,
  UsageLogQuery,
  UsageSummary,
} from "@/modules/usage-log/usage-log.types";

export class UsageLogService {
  async record(input: UsageLogInput): Promise<void> {
    await safeWrite(() => usageLogRepository.create(input), {
      area: "usage",
      action: input.metric,
    });
  }

  async listForProject(projectId: string, query: UsageLogQuery = {}): Promise<UsageLogEntry[]> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const usage = await usageLogRepository.listByProject(projectId, limit);

    return usage.map((item) => ({
      id: item.id,
      metric: item.metric,
      quantity: item.quantity,
      metadata: (item.metadata as Record<string, unknown> | null) ?? null,
      createdAt: item.createdAt.toISOString(),
    }));
  }

  async summarizeForProject(projectId: string): Promise<UsageSummary> {
    const aggregate = await usageLogRepository.aggregateByProject(projectId);
    const totalQuantity = aggregate.byMetric.reduce((sum, metric) => sum + metric.quantity, 0);

    return {
      totalEvents: aggregate.totalEvents,
      totalQuantity,
      byMetric: aggregate.byMetric.sort((a, b) => b.events - a.events),
    };
  }
}

export const usageLogService = new UsageLogService();
