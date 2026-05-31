import { auth } from "@/lib/auth";
import { authorize, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { exchangeCodeForTokens, saveConnection, ensureOrganizationId, getActiveConnection } from "@/lib/zoho";

// ADMIN-only OAuth callback. Zoho appends `code`, plus `location` and
// `accounts-server` for data-center detection (never hardcode the domain).
export async function GET(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  try {
    const session = await auth();
    authorize(session, "adminOnly");

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    if (error) return Response.redirect(`${appUrl}/settings?zoho=error`);
    if (!code) return Response.redirect(`${appUrl}/settings?zoho=missing_code`);

    // Data-center detection: prefer the explicit accounts-server param.
    const accountsServer =
      searchParams.get("accounts-server") || "https://accounts.zoho.com";

    const tokens = await exchangeCodeForTokens(code, accountsServer);
    if (!tokens.access_token || !tokens.refresh_token) {
      return Response.redirect(`${appUrl}/settings?zoho=token_error`);
    }

    await saveConnection({
      tokens,
      accountsDomain: accountsServer,
      connectedById: session!.user.id,
    });

    // Fetch org id immediately so later calls are ready.
    const conn = await getActiveConnection();
    if (conn) {
      try { await ensureOrganizationId(conn); } catch { /* can retry later */ }
    }

    await logAudit({
      userId: session!.user.id,
      action: "SETTINGS_CHANGE",
      entityType: "ZohoConnection",
      entityId: conn?.id ?? "zoho",
      after: { connected: true, apiDomain: tokens.api_domain, accountsServer },
    });

    return Response.redirect(`${appUrl}/settings?zoho=connected`);
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.redirect(`${appUrl}/settings?zoho=error`);
  }
}
