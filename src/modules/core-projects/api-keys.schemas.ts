import { z } from "zod";

export const ApiKeyCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export type ApiKeySummary = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export type ApiKeyCreateResult = {
  apiKey: ApiKeySummary;
  secret: string;
};