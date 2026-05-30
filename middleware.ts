import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Use the edge-compatible config so middleware never imports Prisma/bcrypt
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox-.*|worker-.*).*)"],
};
