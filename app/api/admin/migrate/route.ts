import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorize, AuthzError } from "@/lib/authz";

// One-time, idempotent schema migrations applied on the server (where the
// DB is reachable). ADMIN only. Safe to run repeatedly — every statement
// uses IF NOT EXISTS. Visit this URL once after a deploy that adds a table.
const STATEMENTS: { name: string; sql: string }[] = [
  {
    name: "004-notifications",
    sql: `CREATE TABLE IF NOT EXISTS \`Notification\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`userId\` VARCHAR(191) NOT NULL,
      \`type\` VARCHAR(191) NOT NULL,
      \`message\` TEXT NOT NULL,
      \`link\` VARCHAR(191) NULL,
      \`readAt\` DATETIME(3) NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      INDEX \`Notification_userId_readAt_idx\` (\`userId\`, \`readAt\`),
      INDEX \`Notification_createdAt_idx\` (\`createdAt\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  },
];

async function run() {
  const results: { name: string; ok: boolean; error?: string }[] = [];
  for (const s of STATEMENTS) {
    try {
      await db.$executeRawUnsafe(s.sql);
      results.push({ name: s.name, ok: true });
    } catch (e) {
      results.push({ name: s.name, ok: false, error: e instanceof Error ? e.message : "failed" });
    }
  }
  return results;
}

export async function GET() {
  try {
    const session = await auth();
    authorize(session, "adminOnly");
    const results = await run();
    return Response.json({ applied: results });
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export const POST = GET;
