import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  CORE_DATABASE_URL: z.string().min(1),
  PROJECTS_DATABASE_URL: z.string().min(1),
  // Google OAuth — TODO: configure for production when needed
  GOOGLE_CLIENT_ID: z.string().optional(),
  // Internal admin credentials (used instead of Google OAuth for now)
  ADMIN_EMAIL: z.string().min(1).optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  // TODO: remove before showcasing — bypasses all auth when true
  SKIP_AUTH: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  JWT_SECRET: z.string().min(24, "JWT_SECRET must be at least 24 chars"),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  SENTRY_DSN: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
});

export const env = EnvSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  LOG_LEVEL: process.env.LOG_LEVEL,
  CORE_DATABASE_URL: process.env.CORE_DATABASE_URL,
  PROJECTS_DATABASE_URL: process.env.PROJECTS_DATABASE_URL ?? process.env.PROJECT1_DATABASE_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  SKIP_AUTH: process.env.SKIP_AUTH,
  JWT_SECRET: process.env.JWT_SECRET,
  ACCESS_TOKEN_TTL_MINUTES: process.env.ACCESS_TOKEN_TTL_MINUTES,
  REFRESH_TOKEN_TTL_DAYS: process.env.REFRESH_TOKEN_TTL_DAYS,
  CORS_ORIGINS: process.env.CORS_ORIGINS,
  SENTRY_DSN: process.env.SENTRY_DSN,
  SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE,
});

export const allowedOrigins = new Set(
  env.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);
