import { z } from "zod";

// Scopes follow the "namespace:action" convention so products can add their own
// scopes without modifying the core permissions file.
const SCOPE_PATTERN = /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/;

export const ApiKeyCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  scopes: z
    .array(
      z
        .string()
        .min(1)
        .max(64)
        .regex(SCOPE_PATTERN, "Scope must be in 'namespace:action' format"),
    )
    .max(16)
    .optional(),
});

export type ApiKeySummary = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export type ApiKeyCreateResult = {
  apiKey: ApiKeySummary;
  secret: string;
};