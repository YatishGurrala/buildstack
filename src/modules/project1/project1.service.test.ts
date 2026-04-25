import { project1Service } from "@/modules/project1/project1.service";
import { project1Repository } from "@/modules/project1/project1.repository";

jest.mock("@/modules/project1/project1.repository", () => ({
  project1Repository: {
    listByOwner: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

describe("project1Service", () => {
  it("delegates listNotes", () => {
    project1Service.listNotes("user-1");
    expect(project1Repository.listByOwner).toHaveBeenCalledWith("user-1");
  });

  it("delegates createNote", () => {
    project1Service.createNote("user-1", { title: "A" });
    expect(project1Repository.create).toHaveBeenCalledWith("user-1", { title: "A" });
  });

  it("delegates getNoteById", () => {
    project1Service.getNoteById("n1", "user-1");
    expect(project1Repository.findById).toHaveBeenCalledWith("n1", "user-1");
  });

  it("delegates updateNote and deleteNote", () => {
    project1Service.updateNote("n1", "user-1", { body: "B" });
    project1Service.deleteNote("n1", "user-1");

    expect(project1Repository.update).toHaveBeenCalledWith("n1", "user-1", { body: "B" });
    expect(project1Repository.delete).toHaveBeenCalledWith("n1", "user-1");
  });
});
