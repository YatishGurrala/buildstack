import { PrismaClient } from "@prisma/client";

const globalForCore = globalThis as unknown as { corePrisma?: PrismaClient };

export const coreDb =
  globalForCore.corePrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForCore.corePrisma = coreDb;
}
