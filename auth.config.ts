import type { NextAuthConfig } from "next-auth";

// Edge-compatible config — no Prisma or Node.js-only imports here.
// Used by middleware.ts to protect routes without loading the full auth stack.
export const authConfig = {
  // Required when running behind Hostinger's reverse proxy (non-Vercel host)
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname === "/login";
      const isApiAuth = nextUrl.pathname.startsWith("/api/auth");

      if (isApiAuth) return true;
      if (isLoginPage) {
        // Redirect to dashboard if already authenticated
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }
      // All other routes require authentication
      return isLoggedIn;
    },
  },
  providers: [], // providers are configured in lib/auth.ts
} satisfies NextAuthConfig;
