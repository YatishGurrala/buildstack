import { PrismaClient } from "@/generated/project1";

const globalForProject1 = globalThis as unknown as { project1Prisma?: PrismaClient };

export const project1Db =
  globalForProject1.project1Prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForProject1.project1Prisma = project1Db;
}
