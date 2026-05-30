import type { Session } from "next-auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Action =
  | "read"         // any authenticated user
  | "create"       // any authenticated user
  | "editOwn"      // USER: own record in DRAFT; ADMIN: any
  | "deleteOwn"    // USER: own record in DRAFT; ADMIN: any
  | "editAny"      // ADMIN only
  | "deleteAny"    // ADMIN only
  | "approve"      // ADMIN only
  | "adminOnly";   // ADMIN only (settings, user management)

export interface AuthzTarget {
  createdById?: string;
  status?: string; // DealStatus or LeadStage value
}

// ─── Central authorization gate ───────────────────────────────────────────────
// Call this in EVERY API route / server action before any DB mutation.
// Throws AuthzError on failure — never returns false silently.

export function authorize(
  session: Session | null,
  action: Action,
  target?: AuthzTarget
): void {
  if (!session?.user) throw new AuthzError("Not authenticated", 401);

  const { role, id: userId } = session.user;
  const isAdmin = role === "ADMIN";

  switch (action) {
    case "read":
    case "create":
      return; // all authenticated users

    case "editOwn":
    case "deleteOwn": {
      if (isAdmin) return;
      if (!target) throw new AuthzError("Target required", 400);
      if (target.createdById !== userId)
        throw new AuthzError("You can only edit your own records", 403);
      if (target.status !== "DRAFT")
        throw new AuthzError("Only DRAFT records can be edited", 403);
      return;
    }

    case "editAny":
    case "deleteAny":
    case "approve":
    case "adminOnly": {
      if (!isAdmin) throw new AuthzError("Admin access required", 403);
      return;
    }
  }
}

// ─── Convenience wrappers (for API routes returning JSON responses) ────────────

export function isAdmin(session: Session | null): boolean {
  return session?.user?.role === "ADMIN";
}

export function requireAuth(session: Session | null): asserts session is Session {
  if (!session?.user) throw new AuthzError("Not authenticated", 401);
}

// ─── Error class ──────────────────────────────────────────────────────────────

export class AuthzError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 403
  ) {
    super(message);
    this.name = "AuthzError";
  }

  toResponse() {
    return Response.json({ error: this.message }, { status: this.statusCode });
  }
}
