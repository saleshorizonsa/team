import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/**
 * Normalise DATABASE_URL coming from Hostinger's env injector, which mangles it:
 *  - strip a surrounding pair of quotes (it's stored single-quoted, and Prisma
 *    can't parse a quoted connection string)
 *  - remove stray backslashes (the panel escapes "%" as "\%", corrupting the
 *    percent-encoded password → "credentials not valid")
 *  - trim stray whitespace/newlines
 *  - force the TCP host to 127.0.0.1 ("localhost" resolves to ::1, which has no
 *    MySQL grant → "Access denied … @'::1'")
 */
function resolveDatabaseUrl(): string | undefined {
  let raw = process.env.DATABASE_URL?.trim();
  if (!raw) return undefined;
  if (
    (raw.startsWith("'") && raw.endsWith("'")) ||
    (raw.startsWith('"') && raw.endsWith('"'))
  ) {
    raw = raw.slice(1, -1).trim();
  }
  raw = raw.replace(/\\/g, ""); // drop backslashes (no valid use in a MySQL URL)
  return raw.replace(/@localhost([:/])/, "@127.0.0.1$1");
}

const url = resolveDatabaseUrl();

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(url ? { datasourceUrl: url } : {}),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
