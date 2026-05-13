import { logger } from "@/lib/logger";
import { auditLogRepository } from "@/modules/audit-log/audit-log.repository";
import { auditLogService, sanitizeMetadata } from "@/modules/audit-log/audit-log.service";

jest.mock("@/modules/audit-log/audit-log.repository", () => ({
  auditLogRepository: {
    create: jest.fn(),
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    warn: jest.fn(),
  },
}));

describe("audit log service", () => {
  const mockedCreate = auditLogRepository.create as jest.Mock;
  const mockedWarn = logger.warn as jest.Mock;

  beforeEach(() => {
    mockedCreate.mockReset();
    mockedWarn.mockReset();
  });

  it("sanitizes sensitive metadata fields", () => {
    const sanitized = sanitizeMetadata({
      event: "login",
      password: "hidden",
      nested: {
        token: "hidden",
        safe: "ok",
      },
      list: [{ secret: "hidden" }, { value: 1 }],
    });

    expect(sanitized).toEqual({
      event: "login",
      nested: {
        safe: "ok",
      },
      list: [{}, { value: 1 }],
    });
  });

  it("persists sanitized audit logs", async () => {
    mockedCreate.mockResolvedValue(undefined);

    await auditLogService.log({
      action: "LOGIN_SUCCESS",
      status: "success",
      metadata: {
        source: "web",
        authorization: "Bearer secret",
      },
    });

    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "LOGIN_SUCCESS",
        metadata: {
          source: "web",
        },
      }),
    );
  });

  it("does not throw when persistence fails", async () => {
    mockedCreate.mockRejectedValue(new Error("db unavailable"));

    await expect(
      auditLogService.log({
        action: "LOGIN_FAILED",
        status: "failed",
      }),
    ).resolves.toBeUndefined();

    expect(mockedWarn).toHaveBeenCalled();
  });
});
