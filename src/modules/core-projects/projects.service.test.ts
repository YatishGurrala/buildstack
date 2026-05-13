import { coreDb } from "@/core/db/core";
import { getProjectStorageUsage, provisionProjectSchema, toProjectSchemaName, getProjectAuthSummary, getProjectDatabaseSummary } from "@/core/db/projects";
import { coreProjectsService } from "./projects.service";

jest.mock("@/core/db/core", () => ({
  coreDb: {
    $transaction: jest.fn(),
    project: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    projectMembership: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    apiKey: {
      count: jest.fn(),
    },
  },
}));

jest.mock("@/core/db/projects", () => ({
  getProjectStorageUsage: jest.fn(),
  provisionProjectSchema: jest.fn(),
  toProjectSchemaName: jest.fn((key: string) => `proj_${key.replace(/-/g, "_")}`),
  getProjectAuthSummary: jest.fn(),
  getProjectDatabaseSummary: jest.fn(),
}));

const mockedDb = coreDb as unknown as {
  $transaction: jest.Mock;
  project: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
  };
  projectMembership: {
    findMany: jest.Mock;
    create: jest.Mock;
    findFirst: jest.Mock;
  };
  apiKey: {
    count: jest.Mock;
  };
};

describe("coreProjectsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listForUser", () => {
    it("returns mapped projects for a user", async () => {
      mockedDb.projectMembership.findMany.mockResolvedValue([
        {
          role: "owner",
          createdAt: new Date(),
          project: {
            id: "p1",
            key: "my-project",
            schemaName: "proj_my_project",
            displayName: "My Project",
            createdAt: new Date("2024-01-01"),
          },
        },
      ]);
      (getProjectStorageUsage as jest.Mock).mockResolvedValue(4096);

      const result = await coreProjectsService.listForUser("u1");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "p1",
        key: "my-project",
        schemaName: "proj_my_project",
        role: "owner",
        usage: { storageBytes: 4096 },
      });
      expect(mockedDb.projectMembership.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "u1" } }),
      );
      expect(getProjectStorageUsage).toHaveBeenCalledWith("proj_my_project");
    });

    it("returns empty array when user has no projects", async () => {
      mockedDb.projectMembership.findMany.mockResolvedValue([]);
      const result = await coreProjectsService.listForUser("u1");
      expect(result).toEqual([]);
    });
  });

  describe("createForUser", () => {
    it("creates project with generated key and membership", async () => {
      mockedDb.project.findUnique.mockResolvedValue(null); // key is unique
      mockedDb.$transaction.mockImplementation(async (callback: (tx: typeof mockedDb) => Promise<unknown>) =>
        callback(mockedDb),
      );
      mockedDb.project.create.mockResolvedValue({
        id: "p-new",
        key: "payments-api",
        schemaName: "proj_payments_api",
        displayName: "Payments API",
        createdAt: new Date("2024-06-01"),
      });
      mockedDb.projectMembership.create.mockResolvedValue({
        role: "owner",
        createdAt: new Date(),
      });
      (provisionProjectSchema as jest.Mock).mockResolvedValue(undefined);

      const result = await coreProjectsService.createForUser("u1", "Payments API");

      expect(result).toMatchObject({
        id: "p-new",
        key: "payments-api",
        schemaName: "proj_payments_api",
        role: "owner",
        usage: { storageBytes: 0 },
      });
      expect(mockedDb.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            displayName: "Payments API",
            schemaName: "proj_payments_api",
          }),
        }),
      );
      expect(mockedDb.projectMembership.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ role: "owner", userId: "u1" }) }),
      );
      expect(toProjectSchemaName).toHaveBeenCalledWith("payments-api");
      expect(provisionProjectSchema).toHaveBeenCalledWith("proj_payments_api");
    });

    it("increments key suffix when base key is already taken", async () => {
      mockedDb.project.findUnique
        .mockResolvedValueOnce({ id: "existing" }) // "my-app" taken
        .mockResolvedValueOnce(null); // "my-app-2" free
      mockedDb.$transaction.mockImplementation(async (callback: (tx: typeof mockedDb) => Promise<unknown>) =>
        callback(mockedDb),
      );
      mockedDb.project.create.mockResolvedValue({
        id: "p-new",
        key: "my-app-2",
        schemaName: "proj_my_app_2",
        displayName: "My App",
        createdAt: new Date(),
      });
      mockedDb.projectMembership.create.mockResolvedValue({ role: "owner", createdAt: new Date() });
      (provisionProjectSchema as jest.Mock).mockResolvedValue(undefined);

      const result = await coreProjectsService.createForUser("u1", "My App");
      expect(result.key).toBe("my-app-2");
    });

    it("handles display names with special characters for key generation", async () => {
      mockedDb.project.findUnique.mockResolvedValue(null);
      mockedDb.$transaction.mockImplementation(async (callback: (tx: typeof mockedDb) => Promise<unknown>) =>
        callback(mockedDb),
      );
      mockedDb.project.create.mockResolvedValue({
        id: "p-x",
        key: "hello-world",
        schemaName: "proj_hello_world",
        displayName: "Hello   World!!",
        createdAt: new Date(),
      });
      mockedDb.projectMembership.create.mockResolvedValue({ role: "owner", createdAt: new Date() });
      (provisionProjectSchema as jest.Mock).mockResolvedValue(undefined);

      await coreProjectsService.createForUser("u1", "Hello   World!!");
      expect(mockedDb.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            key: "hello-world",
            schemaName: "proj_hello_world",
          }),
        }),
      );
    });

    it("rolls back the core project when schema provisioning fails", async () => {
      mockedDb.project.findUnique.mockResolvedValue(null);
      mockedDb.$transaction.mockImplementation(async (callback: (tx: typeof mockedDb) => Promise<unknown>) =>
        callback(mockedDb),
      );
      mockedDb.project.create.mockResolvedValue({
        id: "p-fail",
        key: "broken-app",
        schemaName: "proj_broken_app",
        displayName: "Broken App",
        createdAt: new Date(),
      });
      mockedDb.projectMembership.create.mockResolvedValue({ role: "owner", createdAt: new Date() });
      (provisionProjectSchema as jest.Mock).mockRejectedValue(new Error("db unavailable"));

      await expect(coreProjectsService.createForUser("u1", "Broken App")).rejects.toThrow("db unavailable");
      expect(mockedDb.project.delete).toHaveBeenCalledWith({ where: { id: "p-fail" } });
    });
  });

  describe("getServicesForUserProject", () => {
    it("returns service list when user is a member", async () => {
      mockedDb.projectMembership.findFirst.mockResolvedValue({
        userId: "u1",
        projectId: "p1",
        role: "owner",
        project: {
          id: "p1",
          key: "my-project",
          schemaName: "proj_my_project",
          displayName: "My Project",
          createdAt: new Date(),
        },
      });

      const services = await coreProjectsService.getServicesForUserProject("u1", "p1");

      expect(services.length).toBeGreaterThan(0);
      expect(services.some((s) => s.id === "auth")).toBe(true);
      expect(services.some((s) => s.id === "database")).toBe(true);
      expect(services.some((s) => s.id === "analytics")).toBe(true);
    });

    it("returns empty array when user is not a member of the project", async () => {
      mockedDb.projectMembership.findFirst.mockResolvedValue(null);

      const services = await coreProjectsService.getServicesForUserProject("u1", "p-other");
      expect(services).toEqual([]);
    });

    it("returns services for multiple member roles", async () => {
      mockedDb.projectMembership.findFirst.mockResolvedValue({
        userId: "u2",
        projectId: "p1",
        role: "editor",
        project: {
          id: "p1",
          key: "editor-proj",
          schemaName: "proj_editor",
          displayName: "Editor Project",
          createdAt: new Date(),
        },
      });

      const services = await coreProjectsService.getServicesForUserProject("u2", "p1");
      expect(services.length).toBeGreaterThan(0);
    });

    it("returns services for viewer role", async () => {
      mockedDb.projectMembership.findFirst.mockResolvedValue({
        userId: "u3",
        projectId: "p1",
        role: "viewer",
        project: {
          id: "p1",
          key: "viewer-proj",
          schemaName: "proj_viewer",
          displayName: "Viewer Project",
          createdAt: new Date(),
        },
      });

      const services = await coreProjectsService.getServicesForUserProject("u3", "p1");
      expect(services.length).toBeGreaterThan(0);
    });
  });

  describe("additional coverage tests", () => {
    it("handles projects with multiple memberships for different users", async () => {
      mockedDb.projectMembership.findMany.mockResolvedValue([
        {
          role: "owner",
          createdAt: new Date("2024-01-01"),
          project: {
            id: "p1",
            key: "team-project",
            schemaName: "proj_team",
            displayName: "Team Project",
            createdAt: new Date("2024-01-01"),
          },
        },
        {
          role: "owner",
          createdAt: new Date("2024-02-01"),
          project: {
            id: "p2",
            key: "personal-project",
            schemaName: "proj_personal",
            displayName: "Personal Project",
            createdAt: new Date("2024-02-01"),
          },
        },
      ]);
      (getProjectStorageUsage as jest.Mock).mockResolvedValue(8192);

      const result = await coreProjectsService.listForUser("u1");

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe("team-project");
      expect(result[1].key).toBe("personal-project");
    });

    it("processes large project names correctly", async () => {
      mockedDb.project.findUnique.mockResolvedValue(null);
      mockedDb.$transaction.mockImplementation(async (callback: (tx: typeof mockedDb) => Promise<unknown>) =>
        callback(mockedDb),
      );
      const longDisplayName = "This Is A Very Long Display Name That Should Be Truncated To 36 Characters";
      mockedDb.project.create.mockResolvedValue({
        id: "p-long",
        key: "this-is-a-very-long-display-name",
        schemaName: "proj_this_is_a_very_long_display_name",
        displayName: longDisplayName,
        createdAt: new Date(),
      });
      mockedDb.projectMembership.create.mockResolvedValue({ role: "owner", createdAt: new Date() });
      (provisionProjectSchema as jest.Mock).mockResolvedValue(undefined);

      const result = await coreProjectsService.createForUser("u1", longDisplayName);

      expect(result.displayName).toBe(longDisplayName);
      expect(result.key.length).toBeLessThanOrEqual(40);
    });
  });

  describe("getServiceDetailsForUserProject", () => {
    it("returns null when user is not a member", async () => {
      mockedDb.projectMembership.findFirst.mockResolvedValue(null);

      const result = await coreProjectsService.getServiceDetailsForUserProject("u1", "p1", "auth");

      expect(result).toBeNull();
    });

    it("returns auth service details", async () => {
      mockedDb.projectMembership.findFirst.mockResolvedValue({
        userId: "u1",
        projectId: "p1",
        project: {
          id: "p1",
          key: "payments",
          schemaName: "proj_payments",
        },
      });
      (getProjectAuthSummary as jest.Mock).mockResolvedValue({
        lastLogin: new Date(),
        activeUsers: 5,
      });

      const result = await coreProjectsService.getServiceDetailsForUserProject("u1", "p1", "auth");

      expect(result).toEqual({
        service: "auth",
        auth: expect.objectContaining({
          activeUsers: 5,
        }),
      });
      expect(getProjectAuthSummary).toHaveBeenCalledWith("proj_payments");
    });

    it("returns database service details", async () => {
      mockedDb.projectMembership.findFirst.mockResolvedValue({
        userId: "u1",
        projectId: "p1",
        project: {
          id: "p1",
          key: "payments",
          schemaName: "proj_payments",
        },
      });
      (getProjectDatabaseSummary as jest.Mock).mockResolvedValue({
        tables: 10,
        records: 5000,
      });

      const result = await coreProjectsService.getServiceDetailsForUserProject("u1", "p1", "database");

      expect(result).toEqual({
        service: "database",
        database: expect.objectContaining({
          tables: 10,
        }),
      });
      expect(getProjectDatabaseSummary).toHaveBeenCalledWith("proj_payments");
    });

    it("returns api service details with active key count", async () => {
      mockedDb.projectMembership.findFirst.mockResolvedValue({
        userId: "u1",
        projectId: "p1",
        project: {
          id: "p1",
          key: "payments",
          schemaName: "proj_payments",
        },
      });
      mockedDb.apiKey.count.mockResolvedValue(3);

      const result = await coreProjectsService.getServiceDetailsForUserProject("u1", "p1", "api");

      expect(result).toEqual({
        service: "api",
        api: {
          activeApiKeys: 3,
        },
      });
      expect(mockedDb.apiKey.count).toHaveBeenCalledWith({
        where: {
          projectId: "p1",
          revokedAt: null,
        },
      });
    });

    it("returns api service details with zero active keys", async () => {
      mockedDb.projectMembership.findFirst.mockResolvedValue({
        userId: "u1",
        projectId: "p1",
        project: {
          id: "p1",
          key: "new-project",
          schemaName: "proj_new",
        },
      });
      mockedDb.apiKey.count.mockResolvedValue(0);

      const result = await coreProjectsService.getServiceDetailsForUserProject("u1", "p1", "api");

      expect(result).toEqual({
        service: "api",
        api: {
          activeApiKeys: 0,
        },
      });
    });
  });
});
