import { coreDb } from "@/core/db/core";
import { getProjectStorageUsage, provisionProjectSchema, toProjectSchemaName } from "@/core/db/projects";
import { coreProjectsService } from "./projects.service";

jest.mock("@/core/db/core", () => ({
  coreDb: {
    $transaction: jest.fn(),
    project: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    projectMembership: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

jest.mock("@/core/db/projects", () => ({
  getProjectStorageUsage: jest.fn(),
  provisionProjectSchema: jest.fn(),
  toProjectSchemaName: jest.fn((key: string) => `proj_${key.replace(/-/g, "_")}`),
}));

const mockedDb = coreDb as {
  $transaction: jest.Mock;
  project: {
    findUnique: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
  };
  projectMembership: {
    findMany: jest.Mock;
    create: jest.Mock;
    findFirst: jest.Mock;
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
  });
});
