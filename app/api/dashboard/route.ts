import { auth } from "@/lib/auth";
import { authorize, AuthzError } from "@/lib/authz";
import { computeDashboard } from "@/lib/dashboard";

export async function GET(req: Request) {
  try {
    const session = await auth();
    authorize(session, "read");

    const { searchParams } = new URL(req.url);
    const data = await computeDashboard(
      {
        from: searchParams.get("from") ?? undefined,
        to: searchParams.get("to") ?? undefined,
        salespersonId: searchParams.get("salespersonId") ?? undefined,
      },
      session!.user.id
    );
    return Response.json(data);
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
