import { db } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import type { ZohoConnection } from "@prisma/client";

export const ZOHO_SCOPES = [
  "ZohoBooks.invoices.READ",
  "ZohoBooks.contacts.READ",
  "ZohoBooks.settings.READ",
  "ZohoBooks.bills.READ",
  "ZohoBooks.purchaseorders.READ",
];

// Accounts server where the OAuth CLIENT is registered. A client created in a
// specific data center (e.g. api-console.zoho.sa) only exists there, so the
// authorize/token calls must target that DC's accounts server. Configurable via
// ZOHO_ACCOUNTS_DOMAIN (default .com). The *API* domain is still auto-detected
// from the token response (api_domain) for all Books data calls.
const ENTRY_ACCOUNTS = (process.env.ZOHO_ACCOUNTS_DOMAIN || "https://accounts.zoho.com").replace(/\/+$/, "");

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  api_domain?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
}

export function getAuthorizeUrl(): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.ZOHO_CLIENT_ID ?? "",
    scope: ZOHO_SCOPES.join(","),
    redirect_uri: process.env.ZOHO_REDIRECT_URI ?? "",
    access_type: "offline",
    prompt: "consent",
  });
  return `${ENTRY_ACCOUNTS}/oauth/v2/auth?${params.toString()}`;
}

/** Exchange the authorization code for tokens at the detected accounts server. */
export async function exchangeCodeForTokens(
  code: string,
  accountsServer: string
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: process.env.ZOHO_CLIENT_ID ?? "",
    client_secret: process.env.ZOHO_CLIENT_SECRET ?? "",
    redirect_uri: process.env.ZOHO_REDIRECT_URI ?? "",
    code,
  });
  const res = await fetch(`${accountsServer}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return (await res.json()) as TokenResponse;
}

export async function getActiveConnection(): Promise<ZohoConnection | null> {
  return db.zohoConnection.findFirst({ where: { isActive: true }, orderBy: { connectedAt: "desc" } });
}

/** Refresh the access token using the stored (encrypted) refresh token. */
async function refreshAccessToken(conn: ZohoConnection): Promise<string> {
  const accountsDomain = conn.accountsDomain ?? ENTRY_ACCOUNTS;
  const refreshToken = decryptSecret(conn.refreshTokenEnc);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: process.env.ZOHO_CLIENT_ID ?? "",
    client_secret: process.env.ZOHO_CLIENT_SECRET ?? "",
    refresh_token: refreshToken,
  });
  const res = await fetch(`${accountsDomain}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json()) as TokenResponse;
  if (!data.access_token) throw new Error(`Zoho token refresh failed: ${data.error ?? "unknown"}`);

  const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000);
  await db.zohoConnection.update({
    where: { id: conn.id },
    data: {
      accessToken: data.access_token,
      accessTokenExpiresAt: expiresAt,
      // api_domain can appear on refresh too — keep it current
      ...(data.api_domain ? { apiDomain: data.api_domain } : {}),
    },
  });
  return data.access_token;
}

/** Return a valid access token, refreshing ~1 min before expiry. */
export async function getValidAccessToken(conn: ZohoConnection): Promise<string> {
  const fresh =
    conn.accessToken &&
    conn.accessTokenExpiresAt &&
    conn.accessTokenExpiresAt.getTime() - Date.now() > 60_000;
  if (fresh) return conn.accessToken as string;
  return refreshAccessToken(conn);
}

/** GET a Zoho Books API path with auth + 429 exponential backoff. */
export async function zohoApiGet<T = unknown>(
  conn: ZohoConnection,
  path: string,
  query: Record<string, string | undefined> = {}
): Promise<T> {
  const apiDomain = conn.apiDomain;
  if (!apiDomain) throw new Error("Zoho apiDomain not detected");
  const token = await getValidAccessToken(conn);

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v != null && v !== "") params.set(k, v);
  const url = `${apiDomain}/books/v3${path}${params.toString() ? `?${params}` : ""}`;

  let attempt = 0;
  for (;;) {
    const res = await fetch(url, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    if (res.status === 429) {
      attempt++;
      if (attempt > 5) throw new Error("Zoho rate limit (429) — try again shortly");
      await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 16000)));
      continue;
    }
    const data = (await res.json()) as T & { code?: number; message?: string };
    if (!res.ok || (typeof data.code === "number" && data.code !== 0)) {
      throw new Error(`Zoho API error: ${data.message ?? res.status}`);
    }
    return data;
  }
}

/** Fetch & persist the organization id (required on every Books call). */
export async function ensureOrganizationId(conn: ZohoConnection): Promise<string> {
  if (conn.organizationId) return conn.organizationId;
  const data = await zohoApiGet<{ organizations: { organization_id: string }[] }>(
    conn,
    "/organizations"
  );
  const orgId = data.organizations?.[0]?.organization_id;
  if (!orgId) throw new Error("No Zoho organization found");
  await db.zohoConnection.update({ where: { id: conn.id }, data: { organizationId: orgId } });
  return orgId;
}

// ─── Domain helpers (auto-detected, never hardcoded) ──────────────────────────

/** Persist a brand-new connection from the OAuth callback. */
export async function saveConnection(args: {
  tokens: TokenResponse;
  accountsDomain: string;
  connectedById: string;
}): Promise<ZohoConnection> {
  const { tokens, accountsDomain, connectedById } = args;
  if (!tokens.refresh_token) throw new Error("No refresh_token returned by Zoho");

  // Deactivate any previous connections (single active connection).
  await db.zohoConnection.updateMany({ where: { isActive: true }, data: { isActive: false } });

  return db.zohoConnection.create({
    data: {
      refreshTokenEnc: encryptSecret(tokens.refresh_token),
      accessToken: tokens.access_token ?? null,
      accessTokenExpiresAt: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000),
      apiDomain: tokens.api_domain ?? null,
      accountsDomain,
      scopes: tokens.scope ?? ZOHO_SCOPES.join(","),
      isActive: true,
      connectedById,
    },
  });
}
