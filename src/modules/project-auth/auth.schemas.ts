import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

export type AppUser = {
  id: string;
  email: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AuthTokenPayload = {
  sub: string;
  email: string;
  projectKey: string;
};

export type LoginResult = {
  user: AppUser;
  token: string;
  expiresAt: string;
};
