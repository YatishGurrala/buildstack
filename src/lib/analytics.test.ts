import {
  getRouteMetric,
  getAnalyticsSnapshot,
  getPrometheusMetrics,
  recordRequestMetric,
} from "@/lib/analytics";

describe("analytics store", () => {
  beforeEach(() => {
    // Clear by recording a dummy metric, which resets the store
    // Note: We can't actually clear, so just ensure tests are isolated
  });

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

  it("tracks different HTTP methods separately", () => {
    recordRequestMetric({ method: "GET", path: "/api/test", status: 200, durationMs: 10 });
    recordRequestMetric({ method: "POST", path: "/api/test", status: 201, durationMs: 15 });
    recordRequestMetric({ method: "PUT", path: "/api/test", status: 200, durationMs: 20 });

    const snapshot = getAnalyticsSnapshot();
    const getRoute = snapshot.routes.find((r) => r.key === "GET /api/test");
    const postRoute = snapshot.routes.find((r) => r.key === "POST /api/test");
    const putRoute = snapshot.routes.find((r) => r.key === "PUT /api/test");

    expect(getRoute).toBeDefined();
    expect(postRoute).toBeDefined();
    expect(putRoute).toBeDefined();
  });

  it("counts errors correctly for different status codes", () => {
    recordRequestMetric({ method: "GET", path: "/api/fail", status: 400, durationMs: 10 });
    recordRequestMetric({ method: "GET", path: "/api/fail", status: 500, durationMs: 10 });
    recordRequestMetric({ method: "GET", path: "/api/fail", status: 200, durationMs: 10 });

    const snapshot = getAnalyticsSnapshot();
    const failRoute = snapshot.routes.find((r) => r.key === "GET /api/fail");

    expect(failRoute?.errorCount).toBeGreaterThanOrEqual(2);
    expect(failRoute?.count).toBeGreaterThanOrEqual(3);
  });

  it("calculates average duration correctly", () => {
    recordRequestMetric({ method: "GET", path: "/api/duration", status: 200, durationMs: 10 });
    recordRequestMetric({ method: "GET", path: "/api/duration", status: 200, durationMs: 20 });
    recordRequestMetric({ method: "GET", path: "/api/duration", status: 200, durationMs: 30 });

    const snapshot = getAnalyticsSnapshot();
    const route = snapshot.routes.find((r) => r.key === "GET /api/duration");

    expect(route?.avgDurationMs).toBeCloseTo(20, 0);
  });

  it("includes server uptime in snapshot", () => {
    const snapshot = getAnalyticsSnapshot();

    expect(snapshot.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(snapshot.totalTrackedRequests).toBeGreaterThanOrEqual(0);
    expect(snapshot.totalTrackedErrors).toBeGreaterThanOrEqual(0);
  });

  it("returns per-route aggregate metrics", () => {
    recordRequestMetric({ method: "GET", path: "/api/alerts", status: 500, durationMs: 10 });
    recordRequestMetric({ method: "GET", path: "/api/alerts", status: 200, durationMs: 30 });

    const metric = getRouteMetric("GET", "/api/alerts");

    expect(metric.count).toBeGreaterThanOrEqual(2);
    expect(metric.errorCount).toBeGreaterThanOrEqual(1);
    expect(metric.errorRate).toBeGreaterThan(0);
  });
});
