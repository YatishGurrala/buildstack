export const USAGE_METRICS = [
  "auth.login.success",
  "auth.login.failed",
  "records.read",
  "records.write",
  "records.delete",
] as const;

export type UsageMetric = (typeof USAGE_METRICS)[number];

export type UsageLogInput = {
  metric: UsageMetric;
  quantity?: number;
  projectId?: string;
  metadata?: Record<string, unknown>;
};

export type UsageLogQuery = {
  limit?: number;
};

export type UsageLogEntry = {
  id: string;
  metric: string;
  quantity: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type UsageSummary = {
  totalEvents: number;
  totalQuantity: number;
  byMetric: Array<{
    metric: string;
    events: number;
    quantity: number;
  }>;
};
