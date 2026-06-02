import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import withPWAInit from "@ducanh2912/next-pwa";

// Capture the commit being built so /api/version can confirm what's live.
function gitSha(): string {
  if (process.env.NEXT_PUBLIC_BUILD_SHA) return process.env.NEXT_PUBLIC_BUILD_SHA;
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "unknown";
  }
}

const withPWA = withPWAInit({
  dest: "public",
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    // On each new deploy: take over immediately and drop stale precaches so
    // clients never serve old HTML pointing at chunk hashes that no longer exist.
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    // Online-first tool: NO runtime caching of navigations/RSC/API. This keeps
    // every module's data fresh (no cross-module staleness) and avoids the
    // default cache's "cacheWillUpdate / _ref is not defined" sw.js crash.
    // Hashed static build assets are still precached, so install + offline shell work.
    runtimeCaching: [],
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_BUILD_SHA: gitSha(),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
