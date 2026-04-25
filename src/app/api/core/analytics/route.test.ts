import { NextRequest } from "next/server";

import { GET, OPTIONS } from "@/app/api/core/analytics/route";
import { requireUser } from "@/core/auth/guard";
import { getAnalyticsSnapshot, getPrometheusMetrics } from "@/lib/analytics";

jest.mock("@/core/auth/guard", () => ({
  requireUser: jest.fn(),
}));

jest.mock("@/lib/analytics", () => ({
  getAnalyticsSnapshot: jest.fn(),
  getPrometheusMetrics: jest.fn(),
}));

describe("analytics route", () => {
  const mockedRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
  const mockedGetAnalyticsSnapshot = getAnalyticsSnapshot as jest.MockedFunction<
    typeof getAnalyticsSnapshot
  >;
  const mockedGetPrometheusMetrics = getPrometheusMetrics as jest.MockedFunction<
    typeof getPrometheusMetrics
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequireUser.mockResolvedValue({ sub: "u1", email: "u1@example.com" });
  });

  it("returns JSON analytics snapshot", async () => {
    mockedGetAnalyticsSnapshot.mockReturnValue({
      uptimeSeconds: 10,
      totalTrackedRequests: 5,
      totalTrackedErrors: 0,
      routes: [],
      recentEvents: [],
    });
    const request = new NextRequest("http://localhost/api/core/analytics");

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.totalTrackedRequests).toBe(5);
  });

  it("returns Prometheus metrics when format is specified", async () => {
    mockedGetPrometheusMetrics.mockReturnValue("metric 1\n");
    const request = new NextRequest(
      "http://localhost/api/core/analytics?format=prometheus",
    );

    const response = await GET(request);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain("metric 1");
    expect(response.headers.get("Content-Type")).toContain("text/plain");
  });

  it("allows token-based Prometheus scrape without user auth", async () => {
    mockedGetPrometheusMetrics.mockReturnValue("metric 2\n");
    process.env.METRICS_SCRAPE_TOKEN = "metrics-secret";
    const request = new NextRequest(
      "http://localhost/api/core/analytics?format=prometheus",
      {
        headers: {
          Authorization: "Bearer metrics-secret",
        },
      },
    );

    const response = await GET(request);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain("metric 2");
    expect(mockedRequireUser).not.toHaveBeenCalled();
    delete process.env.METRICS_SCRAPE_TOKEN;
  });

  it("rejects Prometheus scrape with invalid token when auth is missing", async () => {
    process.env.METRICS_SCRAPE_TOKEN = "metrics-secret";
    mockedRequireUser.mockRejectedValueOnce(new Error("unauthorized"));

    const request = new NextRequest(
      "http://localhost/api/core/analytics?format=prometheus",
      {
        headers: {
          Authorization: "Bearer wrong-token",
        },
      },
    );

    const response = await GET(request);

    expect(response.status).toBe(500);
    expect(mockedRequireUser).toHaveBeenCalledTimes(1);
    delete process.env.METRICS_SCRAPE_TOKEN;
  });

  it("supports OPTIONS preflight", async () => {
    const request = new NextRequest("http://localhost/api/core/analytics", {
      method: "OPTIONS",
    });

    const response = await OPTIONS(request);

    expect(response.status).toBe(204);
  });
});
