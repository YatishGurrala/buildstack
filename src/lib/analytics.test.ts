import {
  getAnalyticsSnapshot,
  getPrometheusMetrics,
  recordRequestMetric,
} from "@/lib/analytics";

describe("analytics store", () => {
  it("aggregates request metrics by route", () => {
    recordRequestMetric({ method: "GET", path: "/api/health", status: 200, durationMs: 10 });
    recordRequestMetric({ method: "GET", path: "/api/health", status: 500, durationMs: 30 });

    const snapshot = getAnalyticsSnapshot();
    const healthRoute = snapshot.routes.find((route) => route.key === "GET /api/health");

    expect(healthRoute).toBeDefined();
    expect(healthRoute?.count).toBeGreaterThanOrEqual(2);
    expect(healthRoute?.errorCount).toBeGreaterThanOrEqual(1);
    expect(healthRoute?.avgDurationMs).toBeGreaterThan(0);
  });

  it("exports prometheus metrics text", () => {
    const metrics = getPrometheusMetrics();

    expect(metrics).toContain("buildstack_requests_total");
    expect(metrics).toContain("buildstack_request_errors_total");
    expect(metrics).toContain("buildstack_request_avg_duration_ms");
  });
});
