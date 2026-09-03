import type { NextAuthConfig } from "next-auth";
import type { UserRole, UserStatus } from "@prisma/client";

/**
 * Edge-safe Auth.js config (no Prisma / Node APIs).
 * Used by middleware; full Credentials provider lives in lib/auth/index.ts.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as { role: UserRole }).role;
        token.schoolId = (user as { schoolId: string | null }).schoolId;
        token.status = (user as { status: UserStatus }).status;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.schoolId = token.schoolId as string | null;
        session.user.status = token.status as UserStatus;
        session.user.email = (token.email as string) ?? session.user.email;
        session.user.name = (token.name as string) ?? session.user.name;
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = Boolean(auth?.user);

      const isAuthPage =
        pathname.startsWith("/login") ||
        pathname.startsWith("/reset-password") ||
        pathname.startsWith("/accept-invite");

      const isProtected =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/settings") ||
        pathname.startsWith("/staff") ||
        pathname.startsWith("/admin");

      if (isProtected && !isLoggedIn) {
        return false;
      }

      if (pathname.startsWith("/admin") && auth?.user?.role !== "SUPER_ADMIN") {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }

      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }

      return true;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
