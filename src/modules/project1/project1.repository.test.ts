import { project1Repository } from "@/modules/project1/project1.repository";
import { project1Db } from "@/core/db/project1";

jest.mock("@/core/db/project1", () => ({
  project1Db: {
    note: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

describe("project1Repository", () => {
  it("lists notes by owner", () => {
    project1Repository.listByOwner("user-1");

    expect(project1Db.note.findMany).toHaveBeenCalledWith({
      where: { ownerId: "user-1" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("creates a note", () => {
    project1Repository.create("user-1", { title: "Note", body: "Text" });

    expect(project1Db.note.create).toHaveBeenCalledWith({
      data: {
        ownerId: "user-1",
        title: "Note",
        body: "Text",
      },
    });
  });

  it("updates a note with partial fields", () => {
    project1Repository.update("n1", "user-1", { title: "Updated" });

    expect(project1Db.note.updateMany).toHaveBeenCalledWith({
      where: { id: "n1", ownerId: "user-1" },
      data: { title: "Updated" },
    });
  });

  it("deletes note by id and owner", () => {
    project1Repository.delete("n1", "user-1");

    expect(project1Db.note.deleteMany).toHaveBeenCalledWith({
      where: { id: "n1", ownerId: "user-1" },
    });
  });
});
