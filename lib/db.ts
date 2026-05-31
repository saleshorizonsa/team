import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// On Hostinger, "localhost" resolves to IPv6 (::1) but the MySQL grant is
// IPv4-only, so Prisma gets "Access denied … @'::1'". Force the TCP host to
// 127.0.0.1 so the connection matches the grant. (mysql_native over IPv4.)
const rawUrl = process.env.DATABASE_URL ?? "";
const url = rawUrl.replace(/@localhost([:/])/, "@127.0.0.1$1");

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(url ? { datasourceUrl: url } : {}),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
