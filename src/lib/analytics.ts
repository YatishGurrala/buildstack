type RouteMetric = {
  count: number;
  errorCount: number;
  totalDurationMs: number;
};

type RequestEvent = {
  method: string;
  path: string;
  status: number;
  durationMs: number;
};

const MAX_RECENT_EVENTS = 200;
const startedAt = Date.now();
const routeMetrics = new Map<string, RouteMetric>();
const recentEvents: RequestEvent[] = [];

function routeKey(method: string, path: string) {
  return `${method.toUpperCase()} ${path}`;
}

export function recordRequestMetric(event: RequestEvent) {
  const key = routeKey(event.method, event.path);
  const current = routeMetrics.get(key) ?? {
    count: 0,
    errorCount: 0,
    totalDurationMs: 0,
  };

  current.count += 1;
  current.totalDurationMs += event.durationMs;
  if (event.status >= 400) {
    current.errorCount += 1;
  }

  routeMetrics.set(key, current);

  recentEvents.push(event);
  if (recentEvents.length > MAX_RECENT_EVENTS) {
    recentEvents.shift();
  }
}

export function getAnalyticsSnapshot() {
  const routes = Array.from(routeMetrics.entries()).map(([key, metric]) => ({
    key,
    count: metric.count,
    errorCount: metric.errorCount,
    avgDurationMs:
      metric.count > 0 ? Number((metric.totalDurationMs / metric.count).toFixed(2)) : 0,
    errorRate:
      metric.count > 0 ? Number(((metric.errorCount / metric.count) * 100).toFixed(2)) : 0,
  }));

  return {
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    totalTrackedRequests: routes.reduce((sum, route) => sum + route.count, 0),
    totalTrackedErrors: routes.reduce((sum, route) => sum + route.errorCount, 0),
    routes,
    recentEvents,
  };
}

export function getPrometheusMetrics() {
  const lines = [
    '# TYPE buildstack_requests_total counter',
    '# TYPE buildstack_request_errors_total counter',
    '# TYPE buildstack_request_avg_duration_ms gauge',
  ];

  for (const [key, metric] of routeMetrics.entries()) {
    const [method, ...pathParts] = key.split(' ');
    const path = pathParts.join(' ');
    const safePath = path.replace(/"/g, '\\"');
    const avgDuration = metric.count > 0 ? metric.totalDurationMs / metric.count : 0;

    lines.push(
      `buildstack_requests_total{method="${method}",path="${safePath}"} ${metric.count}`,
    );
    lines.push(
      `buildstack_request_errors_total{method="${method}",path="${safePath}"} ${metric.errorCount}`,
    );
    lines.push(
      `buildstack_request_avg_duration_ms{method="${method}",path="${safePath}"} ${avgDuration.toFixed(2)}`,
    );
  }

  return `${lines.join('\n')}\n`;
}
