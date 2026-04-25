import { coreDb } from "@/core/db/core";
import { HttpError } from "@/lib/http";

import { projectApiKeysService } from "./api-keys.service";

jest.mock("node:crypto", () => {
  const actual = jest.requireActual("node:crypto");
  return {
    ...actual,
    randomBytes: jest.fn(() => ({ toString: () => "abc123token" })),
  };
});

jest.mock("@/core/db/core", () => ({
  coreDb: {
    projectMembership: {
      findFirst: jest.fn(),
    },
    apiKey: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockedDb = coreDb as {
  projectMembership: { findFirst: jest.Mock };
  apiKey: {
    findMany: jest.Mock;
    create: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
};

describe("projectApiKeysService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDb.projectMembership.findFirst.mockResolvedValue({
      project: { id: "p1", key: "payments" },
    });
  });

  it("lists active keys for a project", async () => {
    mockedDb.apiKey.findMany.mockResolvedValue([
      {
        id: "key1",
        name: "Web client",
        keyPrefix: "bs_payments_abc",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        lastUsedAt: null,
        revokedAt: null,
      },
    ]);

    const result = await projectApiKeysService.listForUserProject("u1", "p1");

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "key1", name: "Web client" });
    expect(mockedDb.apiKey.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ projectId: "p1", revokedAt: null }) }),
    );
  });

  it("creates and returns a secret once", async () => {
    mockedDb.apiKey.create.mockResolvedValue({
      id: "key1",
      name: "CLI",
      keyPrefix: "bs_payments_abc",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      lastUsedAt: null,
      revokedAt: null,
    });

    const result = await projectApiKeysService.createForUserProject("u1", "p1", "CLI");

    expect(result.secret).toBe("bs_payments_abc123token");
    expect(result.apiKey.name).toBe("CLI");
    expect(mockedDb.apiKey.create).toHaveBeenCalled();
  });

  it("revokes an existing key", async () => {
    mockedDb.apiKey.findFirst.mockResolvedValue({ id: "key1" });

    await projectApiKeysService.revokeForUserProject("u1", "p1", "key1");

    expect(mockedDb.apiKey.update).toHaveBeenCalledWith({
      where: { id: "key1" },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("throws when membership is missing", async () => {
    mockedDb.projectMembership.findFirst.mockResolvedValue(null);

    await expect(projectApiKeysService.listForUserProject("u1", "missing")).rejects.toBeInstanceOf(HttpError);
  });
});