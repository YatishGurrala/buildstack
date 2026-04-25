import { emitErrorRateAlert, shouldTriggerErrorRateAlert } from "@/lib/monitoring";
import { logger } from "@/lib/logger";

jest.mock("@/lib/logger", () => ({
  logger: {
    warn: jest.fn(),
  },
}));

describe("monitoring alerts", () => {
  const mockedWarn = logger.warn as jest.Mock;

  beforeEach(() => {
    mockedWarn.mockReset();
  });

  it("triggers alert when request count and error rate thresholds are exceeded", () => {
    const shouldAlert = shouldTriggerErrorRateAlert({
      route: "GET /api/health",
      count: 50,
      errorCount: 20,
      errorRate: 40,
    });

    expect(shouldAlert).toBe(true);
  });

  it("logs warning for high error rate", () => {
    emitErrorRateAlert({
      route: "GET /api/health",
      count: 50,
      errorCount: 20,
      errorRate: 40,
    });

    expect(mockedWarn).toHaveBeenCalled();
  });

  it("does not log when below threshold", () => {
    emitErrorRateAlert({
      route: "GET /api/health",
      count: 10,
      errorCount: 1,
      errorRate: 10,
    });

    expect(mockedWarn).not.toHaveBeenCalled();
  });
});
