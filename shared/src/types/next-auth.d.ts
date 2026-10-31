import type { DefaultSession } from "next-auth";
import type { PartnerStatus, UserRole } from "@rydex/shared/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      partnerStatus: PartnerStatus;
      phone?: string | null;
      emailVerified?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
    partnerStatus?: PartnerStatus;
    phone?: string | null;
    emailVerified?: Date | string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    partnerStatus?: PartnerStatus;
  }
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, handler: () => void) => void };
  }
}

export {};
