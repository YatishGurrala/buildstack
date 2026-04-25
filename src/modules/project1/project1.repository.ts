import { project1Db } from "@/core/db/project1";

import { NoteCreateInput, NoteUpdateInput } from "./project1.schemas";

export const project1Repository = {
  listByOwner(ownerId: string) {
    return project1Db.note.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    });
  },
  create(ownerId: string, input: NoteCreateInput) {
    return project1Db.note.create({
      data: {
        ownerId,
        title: input.title,
        body: input.body,
      },
    });
  },
  findById(id: string, ownerId: string) {
    return project1Db.note.findFirst({
      where: { id, ownerId },
    });
  },
  update(id: string, ownerId: string, input: NoteUpdateInput) {
    return project1Db.note.updateMany({
      where: { id, ownerId },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.body !== undefined && { body: input.body }),
      },
    });
  },
  delete(id: string, ownerId: string) {
    return project1Db.note.deleteMany({
      where: { id, ownerId },
    });
  },
};
