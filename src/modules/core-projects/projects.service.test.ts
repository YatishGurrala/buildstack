import { coreDb } from "@/core/db/core";
import { coreProjectsService } from "./projects.service";

jest.mock("@/core/db/core", () => ({
  coreDb: {
    project: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    projectMembership: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

const mockedDb = coreDb as {
  project: {
    findUnique: jest.Mock;
    create: jest.Mock;
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
          project: { id: "p1", key: "my-project", displayName: "My Project", createdAt: new Date("2024-01-01") },
        },
      ]);

      const result = await coreProjectsService.listForUser("u1");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: "p1", key: "my-project", role: "owner" });
      expect(mockedDb.projectMembership.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "u1" } }),
      );
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
      mockedDb.project.create.mockResolvedValue({
        id: "p-new",
        key: "payments-api",
        displayName: "Payments API",
        createdAt: new Date("2024-06-01"),
      });
      mockedDb.projectMembership.create.mockResolvedValue({
        role: "owner",
        createdAt: new Date(),
      });

      const result = await coreProjectsService.createForUser("u1", "Payments API");

      expect(result).toMatchObject({ id: "p-new", key: "payments-api", role: "owner" });
      expect(mockedDb.project.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ displayName: "Payments API" }) }),
      );
      expect(mockedDb.projectMembership.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ role: "owner", userId: "u1" }) }),
      );
    });

    it("increments key suffix when base key is already taken", async () => {
      mockedDb.project.findUnique
        .mockResolvedValueOnce({ id: "existing" }) // "my-app" taken
        .mockResolvedValueOnce(null); // "my-app-2" free
      mockedDb.project.create.mockResolvedValue({
        id: "p-new",
        key: "my-app-2",
        displayName: "My App",
        createdAt: new Date(),
      });
      mockedDb.projectMembership.create.mockResolvedValue({ role: "owner", createdAt: new Date() });

      const result = await coreProjectsService.createForUser("u1", "My App");
      expect(result.key).toBe("my-app-2");
    });

    it("handles display names with special characters for key generation", async () => {
      mockedDb.project.findUnique.mockResolvedValue(null);
      mockedDb.project.create.mockResolvedValue({
        id: "p-x",
        key: "hello-world",
        displayName: "Hello   World!!",
        createdAt: new Date(),
      });
      mockedDb.projectMembership.create.mockResolvedValue({ role: "owner", createdAt: new Date() });

      await coreProjectsService.createForUser("u1", "Hello   World!!");
      expect(mockedDb.project.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ key: "hello-world" }) }),
      );
    });
  });

  describe("getServicesForUserProject", () => {
    it("returns service list when user is a member", async () => {
      mockedDb.projectMembership.findFirst.mockResolvedValue({
        userId: "u1",
        projectId: "p1",
        role: "owner",
        project: { id: "p1", key: "my-project", displayName: "My Project", createdAt: new Date() },
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
