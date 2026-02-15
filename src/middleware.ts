import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

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
];

// Public paths that should not be protected
const publicPaths = [
  "/login",
  "/register",
  "/api/auth",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public paths
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Check if the path is protected
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));

  if (isProtectedPath && !req.auth) {
    // Redirect unauthenticated users to login
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon)
     * - public assets (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
