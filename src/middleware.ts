import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Protected route prefixes
const protectedPaths = [
  "/dashboard",
  "/customers",
  "/communications",
  "/voc",
  "/service",
  "/inventory",
  "/faq",
  "/import-export",
  "/integrations",
  "/settings",
  // Phase 2 모듈
  "/board",
  "/projects",
  "/approvals",
  "/calendar",
  "/documents",
  "/meetings",
  "/wiki",
  "/chat",
  "/reports",
  "/sales",
  // 배송 관리
  "/shipments",
  // AI CS 모듈
  "/ai-cs",
  // 새 기능 모듈
  "/campaigns",
  "/automation",
  "/audit-logs",
  "/orders",
  // Round 3 기능
  "/kpi",
  "/contracts",
  "/sla",
  "/report-builder",
  "/follow-ups",
  "/activity-feed",
];

// Public paths that should not be protected
const publicPaths = [
  "/login",
  "/register",
  "/api/auth",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Check if the path is protected
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));

  // Check for NextAuth session token cookie
  const sessionToken =
    req.cookies.get("authjs.session-token") ||
    req.cookies.get("__Secure-authjs.session-token");

  if (isProtectedPath && !sessionToken) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
