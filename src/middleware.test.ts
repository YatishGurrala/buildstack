import { NextRequest } from "next/server";

import { proxy } from "@/proxy";
import { logger } from "@/lib/logger";
import { verifyAccessToken } from "@/core/auth/tokens";
import { recordRequestMetric } from "@/lib/analytics";

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
}));

jest.mock("@/lib/monitoring", () => ({
  emitErrorRateAlert: jest.fn(),
}));

describe("proxy", () => {
  const mockedLoggerInfo = logger.info as jest.Mock;
  const mockedVerifyAccessToken = verifyAccessToken as jest.Mock;
  const mockedRecordRequestMetric = recordRequestMetric as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
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
  });

  it("continues even when token verification fails", async () => {
    mockedVerifyAccessToken.mockRejectedValue(new Error("bad token"));
    const request = new NextRequest("http://localhost/api/health");

    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(mockedLoggerInfo).toHaveBeenCalled();
  });
});
