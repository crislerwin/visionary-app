import { isBackofficeUser } from "@/lib/backoffice";
import bcrypt from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in",
    error: "/auth/error",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.error("[AUTH DEBUG] Authorize called");

        if (!credentials?.email || !credentials?.password) {
          console.error("[AUTH DEBUG] Missing credentials");
          return null;
        }

        try {
          const { prisma } = await import("@/lib/db");

          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          console.error("[AUTH DEBUG] User found:", user ? "yes" : "no");

          if (!user || !user.password) {
            return null;
          }

          const isValid = await bcrypt.compare(credentials.password as string, user.password);
          console.error("[AUTH DEBUG] Password valid:", isValid);

          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error("[AUTH DEBUG] Error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isBackoffice = isBackofficeUser(user.email);
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.isBackoffice = isBackofficeUser(session.user.email);
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
