import type { UserRole, UserStatus } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: UserRole;
      schoolId: string | null;
      status: UserStatus;
      mustChangePassword: boolean;
    };
  }

  interface User {
    role: UserRole;
    schoolId: string | null;
    status: UserStatus;
    mustChangePassword?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    schoolId: string | null;
    status: UserStatus;
    mustChangePassword?: boolean;
  }
}

export {};
