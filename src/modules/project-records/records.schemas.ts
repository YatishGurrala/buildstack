import { z } from "zod";

const CollectionNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, "Collection name can only include letters, numbers, underscores, and dashes");

export const RecordListQuerySchema = z.object({
  collection: CollectionNameSchema.optional(),
  ownerId: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const RecordCreateSchema = z.object({
  collection: CollectionNameSchema,
  ownerId: z.string().trim().min(1).max(120).optional(),
  data: z.record(z.string(), z.unknown()).default({}),
});

export const RecordUpdateSchema = z.object({
  ownerId: z.string().trim().min(1).max(120).nullable().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export type ProjectRecord = {
  id: string;
  collection: string;
  ownerId: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type RecordListQuery = z.infer<typeof RecordListQuerySchema>;
export type RecordCreateInput = z.infer<typeof RecordCreateSchema>;
export type RecordUpdateInput = z.infer<typeof RecordUpdateSchema>;