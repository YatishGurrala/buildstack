import { PrismaClient } from "@prisma/client";

const globalForCore = globalThis as unknown as { corePrisma?: PrismaClient };

export const coreDb =
  globalForCore.corePrisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : process.env.NODE_ENV === "test"
          ? []
          : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForCore.corePrisma = coreDb;
}
