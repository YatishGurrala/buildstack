import { z } from "zod";

export const NoteCreateSchema = z.object({
  title: z.string().min(1).max(160),
  body: z.string().max(2000).optional(),
});

export type NoteCreateInput = z.infer<typeof NoteCreateSchema>;

export const NoteUpdateSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  body: z.string().max(2000).optional().nullable(),
});

export type NoteUpdateInput = z.infer<typeof NoteUpdateSchema>;
