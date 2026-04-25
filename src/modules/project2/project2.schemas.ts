import { z } from "zod";

export const TaskCreateSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
});

export type TaskCreateInput = z.infer<typeof TaskCreateSchema>;

export const TaskUpdateSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  description: z.string().max(2000).optional().nullable(),
  isDone: z.boolean().optional(),
});

export type TaskUpdateInput = z.infer<typeof TaskUpdateSchema>;
