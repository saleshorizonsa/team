import { auth } from "@/lib/auth";
import { authorize, AuthzError } from "@/lib/authz";
import { getActiveConnection } from "@/lib/zoho";

export async function GET() {
  try {
    const session = await auth();
    authorize(session, "adminOnly");

    const conn = await getActiveConnection();
    const configured = !!(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_REDIRECT_URI && process.env.ENCRYPTION_KEY);

    return Response.json({
      configured,
      connected: !!conn,
      organizationId: conn?.organizationId ?? null,
      apiDomain: conn?.apiDomain ?? null,
      connectedAt: conn?.connectedAt ?? null,
    });
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
