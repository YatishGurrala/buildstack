import { logger } from "@/lib/logger";
import { usageLogRepository } from "@/modules/usage-log/usage-log.repository";
import { usageLogService } from "@/modules/usage-log/usage-log.service";

jest.mock("@/modules/usage-log/usage-log.repository", () => ({
  usageLogRepository: {
    create: jest.fn(),
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    warn: jest.fn(),
  },
}));

describe("usage log service", () => {
  const mockedCreate = usageLogRepository.create as jest.Mock;
  const mockedWarn = logger.warn as jest.Mock;

  beforeEach(() => {
    mockedCreate.mockReset();
    mockedWarn.mockReset();
  });

  it("persists usage events", async () => {
    mockedCreate.mockResolvedValue(undefined);

    await usageLogService.record({
      metric: "records.write",
      projectId: "proj_1",
      quantity: 2,
      metadata: { route: "POST /api/v1/proj/records" },
    });

    expect(mockedCreate).toHaveBeenCalledWith({
      metric: "records.write",
      projectId: "proj_1",
      quantity: 2,
      metadata: { route: "POST /api/v1/proj/records" },
    });
  });

  it("does not throw when persistence fails", async () => {
    mockedCreate.mockRejectedValue(new Error("db unavailable"));

    await expect(
      usageLogService.record({
        metric: "records.read",
      }),
    ).resolves.toBeUndefined();

    expect(mockedWarn).toHaveBeenCalled();
  });
});
