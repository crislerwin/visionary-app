import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isBackoffice: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    isBackoffice?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isBackoffice?: boolean;
  }
}
