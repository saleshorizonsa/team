import { auth } from "@/lib/auth";
import { authorize, AuthzError } from "@/lib/authz";
import { getAuthorizeUrl } from "@/lib/zoho";

// ADMIN-only: redirect to Zoho's OAuth consent screen.
export async function GET() {
  try {
    const session = await auth();
    authorize(session, "adminOnly");
    if (!process.env.ZOHO_CLIENT_ID || !process.env.ZOHO_REDIRECT_URI) {
      return Response.json({ error: "Zoho is not configured (missing env vars)" }, { status: 500 });
    }
    return Response.redirect(getAuthorizeUrl());
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
