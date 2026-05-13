import { coreDb } from "@/core/db/core";
import { HttpError } from "@/lib/http";
import { auditLogService } from "@/modules/audit-log/audit-log.service";

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
    project: {
      findFirst: jest.fn(),
    },
    apiKey: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("@/modules/audit-log/audit-log.service", () => ({
  auditLogService: {
    log: jest.fn(),
  },
}));

const mockedDb = coreDb as unknown as {
  projectMembership: { findFirst: jest.Mock };
  project: { findFirst: jest.Mock };
  apiKey: {
    findMany: jest.Mock;
    create: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
};

describe("projectApiKeysService", () => {
  const mockedAuditLog = auditLogService.log as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedDb.projectMembership.findFirst.mockResolvedValue({
      role: "owner",
      project: { id: "p1", key: "payments" },
    });
  });

  it("lists active keys for a project", async () => {
    mockedDb.apiKey.findMany.mockResolvedValue([
      {
        id: "key1",
        name: "Web client",
        keyPrefix: "bs_payments_abc",
        scopes: [{ scope: "records:read" }],
        createdAt: new Date("2026-01-01T00:00:00Z"),
        lastUsedAt: null,
        revokedAt: null,
      },
    ]);

    const result = await projectApiKeysService.listForUserProject("u1", "p1");

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "key1", name: "Web client" });
    expect(result[0].scopes).toEqual(["records:read"]);
    expect(mockedDb.apiKey.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ projectId: "p1", revokedAt: null }) }),
    );
  });

  it("creates and returns a secret once", async () => {
    mockedDb.apiKey.create.mockResolvedValue({
      id: "key1",
      name: "CLI",
      keyPrefix: "bs_payments_abc",
      scopes: [{ scope: "records:read" }, { scope: "records:write" }],
      createdAt: new Date("2026-01-01T00:00:00Z"),
      lastUsedAt: null,
      revokedAt: null,
    });

    const result = await projectApiKeysService.createForUserProject("u1", "p1", "CLI", [
      "records:read",
      "records:write",
      "records:read",
    ]);

    expect(result.secret).toBe("bs_payments_abc123token");
    expect(result.apiKey.name).toBe("CLI");
    expect(mockedDb.apiKey.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          createdByUserId: "u1",
          scopes: {
            createMany: {
              data: [{ scope: "records:read" }, { scope: "records:write" }],
            },
          },
        }),
      }),
    );
    expect(mockedAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CREATE_API_KEY", projectId: "p1" }),
    );
  });

  it("revokes an existing key", async () => {
    mockedDb.apiKey.findFirst.mockResolvedValue({ id: "key1" });

    await projectApiKeysService.revokeForUserProject("u1", "p1", "key1");

    expect(mockedDb.apiKey.update).toHaveBeenCalledWith({
      where: { id: "key1" },
      data: { revokedAt: expect.any(Date) },
    });
    expect(mockedAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "REVOKE_API_KEY", resourceId: "key1" }),
    );
  });

  it("throws when membership is missing", async () => {
    mockedDb.projectMembership.findFirst.mockResolvedValue(null);
    mockedDb.project.findFirst.mockResolvedValue(null);

    await expect(projectApiKeysService.listForUserProject("u1", "missing")).rejects.toBeInstanceOf(HttpError);
  });

  it("allows org-owner fallback when direct membership is absent", async () => {
    mockedDb.projectMembership.findFirst.mockResolvedValue(null);
    mockedDb.project.findFirst.mockResolvedValue({
      id: "p1",
      key: "payments",
      organizationId: "org1",
      organization: {
        members: [{ userId: "u1", role: "owner" }],
      },
    });
    mockedDb.apiKey.findMany.mockResolvedValue([]);

    const result = await projectApiKeysService.listForUserProject("u1", "p1");

    expect(result).toEqual([]);
    expect(mockedDb.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: "p1" }) }),
    );
  });

  it("denies org-viewer fallback for API key management", async () => {
    mockedDb.projectMembership.findFirst.mockResolvedValue(null);
    mockedDb.project.findFirst.mockResolvedValue({
      id: "p1",
      key: "payments",
      organizationId: "org1",
      organization: {
        members: [{ userId: "u1", role: "viewer" }],
      },
    });

    await expect(projectApiKeysService.listForUserProject("u1", "p1")).rejects.toMatchObject({
      status: 403,
      code: "PERMISSION_DENIED",
    });
    expect(mockedDb.apiKey.findMany).not.toHaveBeenCalled();
  });

  it("throws error when trying to revoke non-existent key", async () => {
    mockedDb.apiKey.findFirst.mockResolvedValue(null);

    await expect(projectApiKeysService.revokeForUserProject("u1", "p1", "nonexistent")).rejects.toBeInstanceOf(
      HttpError,
    );
  });

  it("handles multiple keys in list", async () => {
    mockedDb.apiKey.findMany.mockResolvedValue([
      {
        id: "key1",
        name: "Web",
        keyPrefix: "bs_payments_abc",
        scopes: [],
        createdAt: new Date("2026-01-01T00:00:00Z"),
        lastUsedAt: null,
        revokedAt: null,
      },
      {
        id: "key2",
        name: "Mobile",
        keyPrefix: "bs_payments_def",
        scopes: [{ scope: "records:read" }],
        createdAt: new Date("2026-01-02T00:00:00Z"),
        lastUsedAt: new Date("2026-01-15T12:00:00Z"),
        revokedAt: null,
      },
    ]);

    const result = await projectApiKeysService.listForUserProject("u1", "p1");

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Web");
    expect(result[1].name).toBe("Mobile");
    expect(result[1].lastUsedAt).toBeDefined();
  });

  it("excludes revoked keys from list", async () => {
    mockedDb.apiKey.findMany.mockResolvedValue([
      {
        id: "key1",
        name: "Active",
        keyPrefix: "bs_payments_abc",
        scopes: [],
        createdAt: new Date("2026-01-01T00:00:00Z"),
        lastUsedAt: null,
        revokedAt: null,
      },
    ]);

    const result = await projectApiKeysService.listForUserProject("u1", "p1");

    // Verify the query filters to revokedAt: null
    expect(mockedDb.apiKey.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: "p1",
          revokedAt: null,
        }),
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].revokedAt).toBeNull();
  });

  it("creates key with unique name", async () => {
    mockedDb.apiKey.create.mockResolvedValue({
      id: "key-unique",
      name: "Production API",
      keyPrefix: "bs_payments_abc",
      scopes: [],
      createdAt: new Date(),
      lastUsedAt: null,
      revokedAt: null,
    });

    const result = await projectApiKeysService.createForUserProject("u1", "p1", "Production API");

    expect(result.apiKey.name).toBe("Production API");
    expect(result.secret).toBeDefined();
    expect(result.secret).toContain("bs_payments_abc");
  });

  it("verifies authorization before revoke", async () => {
    mockedDb.projectMembership.findFirst.mockResolvedValue(null);

    await expect(projectApiKeysService.revokeForUserProject("u1", "p1", "key1")).rejects.toBeInstanceOf(HttpError);

    expect(mockedDb.apiKey.findFirst).not.toHaveBeenCalled();
  });

  it("sets revokedAt timestamp to current time", async () => {
    const before = new Date();
    mockedDb.apiKey.findFirst.mockResolvedValue({ id: "key1" });

    await projectApiKeysService.revokeForUserProject("u1", "p1", "key1");

    const after = new Date();
    expect(mockedDb.apiKey.update).toHaveBeenCalledWith({
      where: { id: "key1" },
      data: { revokedAt: expect.any(Date) },
    });

    const revokedAt = (mockedDb.apiKey.update as jest.Mock).mock.calls[0][0].data.revokedAt;
    expect(revokedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(revokedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  describe("deleteForUserProject", () => {
    it("deletes a revoked key", async () => {
      mockedDb.apiKey.findFirst.mockResolvedValue({
        id: "key1",
        revokedAt: new Date(),
      });

      await projectApiKeysService.deleteForUserProject("u1", "p1", "key1");

      expect(mockedDb.apiKey.delete).toHaveBeenCalledWith({
        where: { id: "key1" },
      });
    });

    it("throws error when key not found", async () => {
      mockedDb.apiKey.findFirst.mockResolvedValue(null);

      await expect(projectApiKeysService.deleteForUserProject("u1", "p1", "nonexistent")).rejects.toBeInstanceOf(
        HttpError,
      );

      expect(mockedDb.apiKey.delete).not.toHaveBeenCalled();
    });

    it("throws error when trying to delete non-revoked key", async () => {
      mockedDb.apiKey.findFirst.mockResolvedValue({
        id: "key1",
        revokedAt: null,
      });

      await expect(projectApiKeysService.deleteForUserProject("u1", "p1", "key1")).rejects.toThrow(
        "Revoke API key before deleting",
      );

      expect(mockedDb.apiKey.delete).not.toHaveBeenCalled();
    });

    it("verifies authorization before delete", async () => {
      mockedDb.projectMembership.findFirst.mockResolvedValue(null);

      await expect(projectApiKeysService.deleteForUserProject("u1", "p1", "key1")).rejects.toBeInstanceOf(HttpError);

      expect(mockedDb.apiKey.findFirst).not.toHaveBeenCalled();
    });

    it("requires project membership for delete operation", async () => {
      mockedDb.projectMembership.findFirst.mockResolvedValue({
        role: "owner",
        project: { id: "p1", key: "test" },
      });
      mockedDb.apiKey.findFirst.mockResolvedValue({
        id: "key1",
        revokedAt: new Date(),
      });

      await projectApiKeysService.deleteForUserProject("u1", "p1", "key1");

      expect(mockedDb.apiKey.delete).toHaveBeenCalledWith({
        where: { id: "key1" },
      });
    });

    it("denies API key management for viewer role", async () => {
      mockedDb.projectMembership.findFirst.mockResolvedValue({
        role: "viewer",
        project: { id: "p1", key: "payments" },
      });

      await expect(projectApiKeysService.listForUserProject("u1", "p1")).rejects.toBeInstanceOf(HttpError);
      await expect(projectApiKeysService.listForUserProject("u1", "p1")).rejects.toMatchObject({
        status: 403,
        code: "PERMISSION_DENIED",
      });

      expect(mockedDb.apiKey.findMany).not.toHaveBeenCalled();
    });
  });
});