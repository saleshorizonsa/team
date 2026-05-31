// Public build marker — lets a deploy watcher confirm which commit is live.
// NEXT_PUBLIC_BUILD_SHA is injected at build time (falls back to "dev").
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    sha: process.env.NEXT_PUBLIC_BUILD_SHA ?? "unknown",
    builtAt: process.env.NEXT_PUBLIC_BUILD_TIME ?? null,
  });
}
