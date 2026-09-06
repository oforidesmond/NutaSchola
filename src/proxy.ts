import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

/**
 * Next.js 16 renamed middleware → proxy. Auth.js `.auth` still runs as the
 * request interceptor (login gates + SUPER_ADMIN check for /admin).
 */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/settings",
    "/settings/:path*",
    "/staff",
    "/staff/:path*",
    "/admissions",
    "/admissions/:path*",
    "/admin",
    "/admin/:path*",
    "/login",
    "/reset-password",
    "/accept-invite",
  ],
};
