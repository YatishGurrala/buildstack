import { project2Repository } from "@/modules/project2/project2.repository";
import { TaskCreateInput, TaskUpdateInput } from "@/modules/project2/project2.schemas";

export const project2Service = {
  listTasks(userId: string) {
    return project2Repository.listByOwner(userId);
  },
  createTask(userId: string, input: TaskCreateInput) {
    return project2Repository.create(userId, input);
  },
  getTaskById(id: string, userId: string) {
    return project2Repository.findById(id, userId);
  },
  updateTask(id: string, userId: string, input: TaskUpdateInput) {
    return project2Repository.update(id, userId, input);
  },
  deleteTask(id: string, userId: string) {
    return project2Repository.delete(id, userId);
  },
};
