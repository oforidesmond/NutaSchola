import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import type { UserStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { authConfig } from "@/lib/auth/config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim().toLowerCase();
        const password = credentials?.password?.toString();

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findFirst({
          where: { email, deletedAt: null },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        if (user.status === "SUSPENDED" || user.status === "INACTIVE") {
          return null;
        }

        const valid = await compare(password, user.passwordHash);
        if (!valid) {
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date(), status: "ACTIVE" },
        });

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          schoolId: user.schoolId,
          status: "ACTIVE" as UserStatus,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id!;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.schoolId = user.schoolId;
        token.status = user.status;
        token.mustChangePassword = Boolean(user.mustChangePassword);
      }

      // Refresh status / mustChangePassword from DB so deactivate and password
      // changes take effect on the next request without waiting for JWT expiry.
      if (token.id && (trigger === "update" || !user)) {
        try {
          const dbUser = await prisma.user.findFirst({
            where: { id: token.id as string },
            select: {
              status: true,
              deletedAt: true,
              mustChangePassword: true,
              role: true,
              schoolId: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          });
          if (!dbUser || dbUser.deletedAt) {
            token.status = "INACTIVE";
            token.mustChangePassword = false;
          } else {
            token.status = dbUser.status;
            token.mustChangePassword = dbUser.mustChangePassword;
            token.role = dbUser.role;
            token.schoolId = dbUser.schoolId;
            token.email = dbUser.email;
            token.name = `${dbUser.firstName} ${dbUser.lastName}`;
          }
        } catch {
          // Keep existing claims if DB is briefly unavailable.
        }
      }

      return token;
    },
  },
});
