import type { Session } from "next-auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Action =
  | "read"         // any authenticated user
  | "create"       // any authenticated user
  | "editOwn"      // USER: own record (no status gate); ADMIN: any
  | "deleteOwn"    // USER: own record (no status gate); ADMIN: any
  | "editOwnDraft" // USER: own record AND status === "DRAFT"; ADMIN: any
  | "deleteOwnDraft" // USER: own record AND status === "DRAFT"; ADMIN: any
  | "editAny"      // ADMIN only
  | "deleteAny"    // ADMIN only
  | "approve"      // ADMIN only
  | "adminOnly";   // ADMIN only (settings, user management)

export interface AuthzTarget {
  createdById?: string;  // also accepts ownerId via alias
  ownerId?: string;
  status?: string;       // DealStatus value — only checked for …Draft actions
}

// ─── Central authorization gate ───────────────────────────────────────────────
// Call in EVERY API route / server action before any DB mutation.
// Throws AuthzError on failure — never returns false silently.

export function authorize(
  session: Session | null,
  action: Action,
  target?: AuthzTarget
): void {
  if (!session?.user) throw new AuthzError("Not authenticated", 401);

  const { role, id: userId } = session.user;
  const isAdmin = role === "ADMIN";
  const ownerId = target?.createdById ?? target?.ownerId;

  switch (action) {
    case "read":
    case "create":
      return;

    case "editOwn":
    case "deleteOwn": {
      if (isAdmin) return;
      if (!target) throw new AuthzError("Target required", 400);
      if (ownerId !== userId)
        throw new AuthzError("You can only modify your own records", 403);
      return;
    }

    case "editOwnDraft":
    case "deleteOwnDraft": {
      if (isAdmin) return;
      if (!target) throw new AuthzError("Target required", 400);
      if (ownerId !== userId)
        throw new AuthzError("You can only modify your own records", 403);
      if (target.status !== "DRAFT")
        throw new AuthzError("Only DRAFT records can be modified", 403);
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

// ─── Convenience helpers ──────────────────────────────────────────────────────

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
