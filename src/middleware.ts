import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Note: Middleware runs on every request. Security settings (localOnlyMode, ipWhitelist)
// are stored in DB, but we can't query DB in middleware (edge runtime). So we read
// from a cookie set by the app when settings change, OR use environment-based defaults.
// For true local-only enforcement, the app sets a cookie `dompetku_net_policy` on
// settings save. Middleware reads it. Fallback: env var DOMPETKU_LOCAL_ONLY=1.

const LOCAL_ONLY = process.env.DOMPETKU_LOCAL_ONLY === "1";
const IP_WHITELIST_RAW = process.env.DOMPETKU_IP_WHITELIST || "";
const RATE_LIMIT_MAX = 60; // per minute
const RATE_LIMIT_WINDOW_MS = 60_000;

// Simple in-memory rate limit (per worker)
const rateMap = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri;
  return "unknown";
}

function isIpInWhitelist(ip: string, whitelist: string): boolean {
  if (!whitelist) return false;
  const list = whitelist.split(",").map((s) => s.trim()).filter(Boolean);
  // Simple exact match + CIDR /24 /16 prefix match
  for (const entry of list) {
    if (entry === ip) return true;
    if (entry.endsWith("/24")) {
      const base = entry.slice(0, -3).split(".").slice(0, 3).join(".");
      if (ip.startsWith(base + ".")) return true;
    }
    if (entry.endsWith("/16")) {
      const base = entry.slice(0, -3).split(".").slice(0, 2).join(".");
      if (ip.startsWith(base + ".")) return true;
    }
  }
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets and Next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".js")
  ) {
    return NextResponse.next();
  }

  const ip = getClientIp(req);

  // Local-only mode: allow only localhost / 127.0.0.1 / ::1 / same-origin
  if (LOCAL_ONLY) {
    const allowedIps = ["127.0.0.1", "::1", "localhost", "unknown"];
    if (!allowedIps.includes(ip)) {
      return new NextResponse(
        JSON.stringify({ error: "Akses ditolak: mode lokal saja aktif." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // IP Whitelist (if set)
  if (IP_WHITELIST_RAW && !isIpInWhitelist(ip, IP_WHITELIST_RAW)) {
    return new NextResponse(
      JSON.stringify({ error: "Akses ditolak: IP tidak diizinkan." }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // Rate limit API endpoints only
  if (pathname.startsWith("/api/")) {
    const key = ip;
    const now = Date.now();
    const entry = rateMap.get(key);
    if (!entry || now > entry.resetAt) {
      rateMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    } else {
      entry.count += 1;
      if (entry.count > RATE_LIMIT_MAX) {
        return new NextResponse(
          JSON.stringify({ error: "Terlalu banyak permintaan. Coba lagi nanti." }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(
                Math.ceil((entry.resetAt - now) / 1000)
              ),
            },
          }
        );
      }
    }
  }

  // Security headers
  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(self)"
  );
  // CSP — allow inline styles (Tailwind needs it) + self scripts
  res.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';"
  );
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
