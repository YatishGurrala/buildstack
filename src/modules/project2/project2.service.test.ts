import { project2Service } from "@/modules/project2/project2.service";
import { project2Repository } from "@/modules/project2/project2.repository";

jest.mock("@/modules/project2/project2.repository", () => ({
  project2Repository: {
    listByOwner: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

describe("project2Service", () => {
  it("delegates listTasks", () => {
    project2Service.listTasks("user-1");
    expect(project2Repository.listByOwner).toHaveBeenCalledWith("user-1");
  });

  it("delegates createTask", () => {
    project2Service.createTask("user-1", { title: "Task" });
    expect(project2Repository.create).toHaveBeenCalledWith("user-1", { title: "Task" });
  });

  it("delegates getTaskById", () => {
    project2Service.getTaskById("t1", "user-1");
    expect(project2Repository.findById).toHaveBeenCalledWith("t1", "user-1");
  });

  it("delegates updateTask and deleteTask", () => {
    project2Service.updateTask("t1", "user-1", { isDone: true });
    project2Service.deleteTask("t1", "user-1");

    expect(project2Repository.update).toHaveBeenCalledWith("t1", "user-1", { isDone: true });
    expect(project2Repository.delete).toHaveBeenCalledWith("t1", "user-1");
  });
});
