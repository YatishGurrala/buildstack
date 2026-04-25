import { project2Db } from "@/core/db/project2";

import { TaskCreateInput, TaskUpdateInput } from "./project2.schemas";

export const project2Repository = {
  listByOwner(ownerId: string) {
    return project2Db.task.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    });
  },
  create(ownerId: string, input: TaskCreateInput) {
    return project2Db.task.create({
      data: {
        ownerId,
        title: input.title,
        description: input.description,
      },
    });
  },
  findById(id: string, ownerId: string) {
    return project2Db.task.findFirst({
      where: { id, ownerId },
    });
  },
  update(id: string, ownerId: string, input: TaskUpdateInput) {
    return project2Db.task.updateMany({
      where: { id, ownerId },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.isDone !== undefined && { isDone: input.isDone }),
      },
    });
  },
  delete(id: string, ownerId: string) {
    return project2Db.task.deleteMany({
      where: { id, ownerId },
    });
  },
};
