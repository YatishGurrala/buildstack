import { projectRecordsService } from "./records.service";
import * as projectsDb from "@/core/db/projects";
import { HttpError } from "@/lib/http";

jest.mock("@/core/db/projects");
jest.mock("node:crypto", () => ({
  ...jest.requireActual("node:crypto"),
  randomUUID: () => "test-uuid-123",
}));

describe("projectRecordsService", () => {
  const mockSchemaName = "public";
  type ProjectRecordRow = {
    id: string;
    collection: string;
    owner_id: string | null;
    data: Record<string, unknown>;
    created_at: Date | string;
    updated_at: Date | string;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("returns list of records for valid query", async () => {
      const mockRecords = [
        {
          id: "rec-1",
          collection: "users",
          owner_id: "user-123",
          data: { name: "John Doe" },
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: "rec-2",
          collection: "users",
          owner_id: "user-123",
          data: { name: "Jane Doe" },
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      jest
        .spyOn(projectsDb, "listProjectRecords")
        .mockResolvedValue(mockRecords as unknown as ProjectRecordRow[]);

      const result = await projectRecordsService.list(mockSchemaName, {
        collection: "users",
        limit: 10,
      });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("rec-1");
      expect(result[0].collection).toBe("users");
      expect(projectsDb.listProjectRecords).toHaveBeenCalledWith(mockSchemaName, {
        collection: "users",
        limit: 10,
      });
    });

    it("returns empty list when no records found", async () => {
      jest.spyOn(projectsDb, "listProjectRecords").mockResolvedValue([]);

      const result = await projectRecordsService.list(mockSchemaName, {
        collection: "users",
        limit: 10,
      });

      expect(result).toHaveLength(0);
    });

    it("passes collection and limit parameters", async () => {
      jest.spyOn(projectsDb, "listProjectRecords").mockResolvedValue([]);

      await projectRecordsService.list(mockSchemaName, {
        collection: "users",
        limit: 50,
      });

      expect(projectsDb.listProjectRecords).toHaveBeenCalledWith(mockSchemaName, {
        collection: "users",
        limit: 50,
      });
    });
  });

  describe("create", () => {
    it("creates a new record with provided data", async () => {
      const mockRecord = {
        id: "test-uuid-123",
        collection: "users",
        owner_id: "user-123",
        data: { name: "Test User" },
        created_at: new Date(),
        updated_at: new Date(),
      };

      jest
        .spyOn(projectsDb, "createProjectRecord")
        .mockResolvedValue(mockRecord as unknown as ProjectRecordRow);

      const result = await projectRecordsService.create(mockSchemaName, {
        collection: "users",
        ownerId: "user-123",
        data: { name: "Test User" },
      });

      expect(result.id).toBe("test-uuid-123");
      expect(result.collection).toBe("users");
      expect(result.ownerId).toBe("user-123");
      expect(result.data).toEqual({ name: "Test User" });
      expect(projectsDb.createProjectRecord).toHaveBeenCalled();
    });

    it("creates record without owner when ownerId not provided", async () => {
      const mockRecord = {
        id: "test-uuid-123",
        collection: "settings",
        owner_id: null,
        data: { theme: "dark" },
        created_at: new Date(),
        updated_at: new Date(),
      };

      jest
        .spyOn(projectsDb, "createProjectRecord")
        .mockResolvedValue(mockRecord as unknown as ProjectRecordRow);

      const result = await projectRecordsService.create(mockSchemaName, {
        collection: "settings",
        data: { theme: "dark" },
      });

      expect(result.ownerId).toBeNull();
      expect(projectsDb.createProjectRecord).toHaveBeenCalledWith(mockSchemaName, expect.objectContaining({
        ownerId: null,
      }));
    });

    it("handles complex data structures", async () => {
      const complexData = {
        metadata: {
          tags: ["important", "urgent"],
          nested: { level: 2, active: true },
        },
      };

      const mockRecord = {
        id: "test-uuid-123",
        collection: "tasks",
        owner_id: "user-123",
        data: complexData,
        created_at: new Date(),
        updated_at: new Date(),
      };

      jest
        .spyOn(projectsDb, "createProjectRecord")
        .mockResolvedValue(mockRecord as unknown as ProjectRecordRow);

      const result = await projectRecordsService.create(mockSchemaName, {
        collection: "tasks",
        ownerId: "user-123",
        data: complexData,
      });

      expect(result.data).toEqual(complexData);
    });
  });

  describe("getById", () => {
    it("returns record by id", async () => {
      const mockRecord = {
        id: "rec-1",
        collection: "users",
        owner_id: "user-123",
        data: { name: "John Doe" },
        created_at: new Date(),
        updated_at: new Date(),
      };

      jest
        .spyOn(projectsDb, "getProjectRecordById")
        .mockResolvedValue(mockRecord as unknown as ProjectRecordRow);

      const result = await projectRecordsService.getById(mockSchemaName, "rec-1");

      expect(result.id).toBe("rec-1");
      expect(result.collection).toBe("users");
      expect(projectsDb.getProjectRecordById).toHaveBeenCalledWith(mockSchemaName, "rec-1");
    });

    it("throws error when record not found", async () => {
      jest
        .spyOn(projectsDb, "getProjectRecordById")
        .mockResolvedValue(null as unknown as ProjectRecordRow);

      await expect(projectRecordsService.getById(mockSchemaName, "non-existent")).rejects.toThrow(HttpError);
      await expect(projectRecordsService.getById(mockSchemaName, "non-existent")).rejects.toThrow("Record not found");
    });

    it("handles record with null owner", async () => {
      const mockRecord = {
        id: "rec-1",
        collection: "public-data",
        owner_id: null,
        data: { content: "public" },
        created_at: new Date(),
        updated_at: new Date(),
      };

      jest
        .spyOn(projectsDb, "getProjectRecordById")
        .mockResolvedValue(mockRecord as unknown as ProjectRecordRow);

      const result = await projectRecordsService.getById(mockSchemaName, "rec-1");

      expect(result.ownerId).toBeNull();
    });
  });

  describe("update", () => {
    it("updates record with new data", async () => {
      const updatedRecord = {
        id: "rec-1",
        collection: "users",
        owner_id: "user-123",
        data: { name: "Updated Name" },
        created_at: new Date(),
        updated_at: new Date(),
      };

      jest
        .spyOn(projectsDb, "updateProjectRecord")
        .mockResolvedValue(updatedRecord as unknown as ProjectRecordRow);

      const result = await projectRecordsService.update(mockSchemaName, "rec-1", {
        data: { name: "Updated Name" },
      });

      expect(result.data.name).toBe("Updated Name");
      expect(projectsDb.updateProjectRecord).toHaveBeenCalledWith(mockSchemaName, "rec-1", {
        data: { name: "Updated Name" },
      });
    });

    it("throws error when record to update not found", async () => {
      jest
        .spyOn(projectsDb, "updateProjectRecord")
        .mockResolvedValue(null as unknown as ProjectRecordRow);

      await expect(
        projectRecordsService.update(mockSchemaName, "non-existent", { data: { name: "Test" } })
      ).rejects.toThrow("Record not found");
    });

    it("allows partial updates", async () => {
      const updatedRecord = {
        id: "rec-1",
        collection: "users",
        owner_id: "user-123",
        data: { name: "John", status: "active" },
        created_at: new Date(),
        updated_at: new Date(),
      };

      jest
        .spyOn(projectsDb, "updateProjectRecord")
        .mockResolvedValue(updatedRecord as unknown as ProjectRecordRow);

      const result = await projectRecordsService.update(mockSchemaName, "rec-1", {
        data: { status: "active" },
      });

      expect(result.id).toBe("rec-1");
      expect(projectsDb.updateProjectRecord).toHaveBeenCalled();
    });

    it("handles update with complex data", async () => {
      const complexUpdate = {
        data: {
          tags: ["new-tag"],
          metadata: { version: 2 },
        },
      };

      const updatedRecord = {
        id: "rec-1",
        collection: "items",
        owner_id: "user-123",
        data: complexUpdate.data,
        created_at: new Date(),
        updated_at: new Date(),
      };

      jest
        .spyOn(projectsDb, "updateProjectRecord")
        .mockResolvedValue(updatedRecord as unknown as ProjectRecordRow);

      const result = await projectRecordsService.update(mockSchemaName, "rec-1", complexUpdate);

      expect(result.data).toEqual(complexUpdate.data);
    });
  });

  describe("delete", () => {
    it("deletes record successfully", async () => {
      jest.spyOn(projectsDb, "deleteProjectRecord").mockResolvedValue(true);

      await expect(projectRecordsService.delete(mockSchemaName, "rec-1")).resolves.toBeUndefined();

      expect(projectsDb.deleteProjectRecord).toHaveBeenCalledWith(mockSchemaName, "rec-1");
    });

    it("throws error when record to delete not found", async () => {
      jest.spyOn(projectsDb, "deleteProjectRecord").mockResolvedValue(false);

      await expect(projectRecordsService.delete(mockSchemaName, "non-existent")).rejects.toThrow("Record not found");
    });

    it("handles deletion of record with owner", async () => {
      jest.spyOn(projectsDb, "deleteProjectRecord").mockResolvedValue(true);

      await projectRecordsService.delete(mockSchemaName, "rec-owned-1");

      expect(projectsDb.deleteProjectRecord).toHaveBeenCalledWith(mockSchemaName, "rec-owned-1");
    });
  });
});
