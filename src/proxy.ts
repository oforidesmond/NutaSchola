import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/config";

/**
 * Next.js 16 renamed middleware → proxy. Auth.js `.auth` still runs as the
 * request interceptor (login gates + SUPER_ADMIN check for /admin).
 * Forwards pathname so authenticated layouts can enforce mustChangePassword.
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
});

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/settings",
    "/settings/:path*",
    "/staff",
    "/staff/:path*",
    "/account",
    "/account/:path*",
    "/admissions",
    "/admissions/:path*",
    "/admin",
    "/admin/:path*",
    "/login",
    "/reset-password",
    "/accept-invite",
  ],
};
