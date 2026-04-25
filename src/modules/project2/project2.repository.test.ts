import { project2Repository } from "@/modules/project2/project2.repository";
import { project2Db } from "@/core/db/project2";

jest.mock("@/core/db/project2", () => ({
  project2Db: {
    task: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

describe("project2Repository", () => {
  it("lists tasks by owner", () => {
    project2Repository.listByOwner("user-1");

    expect(project2Db.task.findMany).toHaveBeenCalledWith({
      where: { ownerId: "user-1" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("creates task with optional description", () => {
    project2Repository.create("user-1", { title: "Task", description: "D" });

    expect(project2Db.task.create).toHaveBeenCalledWith({
      data: {
        ownerId: "user-1",
        title: "Task",
        description: "D",
      },
    });
  });

  it("updates multiple task fields", () => {
    project2Repository.update("t1", "user-1", {
      title: "Updated",
      isDone: true,
    });

    expect(project2Db.task.updateMany).toHaveBeenCalledWith({
      where: { id: "t1", ownerId: "user-1" },
      data: {
        title: "Updated",
        isDone: true,
      },
    });
  });

  it("deletes task by id and owner", () => {
    project2Repository.delete("t1", "user-1");

    expect(project2Db.task.deleteMany).toHaveBeenCalledWith({
      where: { id: "t1", ownerId: "user-1" },
    });
  });
});
