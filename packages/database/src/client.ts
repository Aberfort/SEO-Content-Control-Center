import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  __scccPrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.__scccPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["warn", "error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__scccPrisma = prisma;
}

export type { PrismaClient };
