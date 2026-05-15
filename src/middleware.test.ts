import { NextRequest } from "next/server";

import { proxy } from "@/proxy";
import { logger } from "@/lib/logger";
import { verifyAccessToken } from "@/core/auth/tokens";
import { getRouteMetric, recordRequestMetric } from "@/lib/analytics";
import { emitErrorRateAlert } from "@/lib/monitoring";

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
  },
}));

jest.mock("@/core/auth/tokens", () => ({
  verifyAccessToken: jest.fn(),
}));

jest.mock("@/lib/analytics", () => ({
  recordRequestMetric: jest.fn(),
  getRouteMetric: jest.fn(),
}));

jest.mock("@/lib/monitoring", () => ({
  emitErrorRateAlert: jest.fn(),
}));

describe("proxy", () => {
  const mockedLoggerInfo = logger.info as jest.Mock;
  const mockedVerifyAccessToken = verifyAccessToken as jest.Mock;
  const mockedRecordRequestMetric = recordRequestMetric as jest.Mock;
  const mockedGetRouteMetric = getRouteMetric as jest.Mock;
  const mockedEmitErrorRateAlert = emitErrorRateAlert as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetRouteMetric.mockReturnValue({
      key: "GET /api/health",
      count: 1,
      errorCount: 0,
      avgDurationMs: 0,
      errorRate: 0,
    });
  });

  it("logs request with user context when token is valid", async () => {
    mockedVerifyAccessToken.mockResolvedValue({ sub: "u1", email: "u1@example.com" });
    const request = new NextRequest("http://localhost/api/health", {
      headers: {
        authorization: "Bearer token",
      },
    });

    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(mockedLoggerInfo).toHaveBeenCalled();
    expect(mockedRecordRequestMetric).toHaveBeenCalled();
    expect(mockedEmitErrorRateAlert).toHaveBeenCalledWith(
      expect.objectContaining({ count: 1, errorRate: 0 }),
    );
  });

  it("uses access_token cookie when authorization header is absent", async () => {
    mockedVerifyAccessToken.mockResolvedValue({ sub: "u-cookie", email: "cookie@example.com" });

    const request = new NextRequest("http://localhost/api/health", {
      headers: {
        cookie: "access_token=cookie.token",
      },
    });

    await proxy(request);

    expect(mockedVerifyAccessToken).toHaveBeenCalledWith("cookie.token");
  });

  it("continues even when token verification fails", async () => {
    mockedVerifyAccessToken.mockRejectedValue(new Error("bad token"));
    const request = new NextRequest("http://localhost/api/health");

    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(mockedLoggerInfo).toHaveBeenCalled();
  });
});
