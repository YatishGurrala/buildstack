import { PrismaClient } from "@/generated/project2";

const globalForProject2 = globalThis as unknown as { project2Prisma?: PrismaClient };

export const project2Db =
  globalForProject2.project2Prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForProject2.project2Prisma = project2Db;
}
