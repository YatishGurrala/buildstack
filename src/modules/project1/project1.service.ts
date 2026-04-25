import { project1Repository } from "@/modules/project1/project1.repository";
import { NoteCreateInput, NoteUpdateInput } from "@/modules/project1/project1.schemas";

export const project1Service = {
  listNotes(userId: string) {
    return project1Repository.listByOwner(userId);
  },
  createNote(userId: string, input: NoteCreateInput) {
    return project1Repository.create(userId, input);
  },
  getNoteById(id: string, userId: string) {
    return project1Repository.findById(id, userId);
  },
  updateNote(id: string, userId: string, input: NoteUpdateInput) {
    return project1Repository.update(id, userId, input);
  },
  deleteNote(id: string, userId: string) {
    return project1Repository.delete(id, userId);
  },
};
