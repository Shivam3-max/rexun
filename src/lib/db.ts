import { PrismaClient } from "@prisma/client";

// Next's dev server re-evaluates modules on every edit; without the global
// cache that opens a new pool each time until SQLite refuses connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
