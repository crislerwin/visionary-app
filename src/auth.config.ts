import { isBackofficeUser } from "@/lib/backoffice";
import { logger } from "@/lib/logger";
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
        logger.debug("[AUTH] Authorize called");

        if (!credentials?.email || !credentials?.password) {
          logger.debug("[AUTH] Missing credentials");
          return null;
        }

        try {
          const { prisma } = await import("@/lib/db");

          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          logger.debug({ userFound: !!user }, "[AUTH] User lookup");

          if (!user || !user.password) {
            return null;
          }

          const isValid = await bcrypt.compare(credentials.password as string, user.password);
          logger.debug({ isValid }, "[AUTH] Password check");

          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          logger.error({ error }, "[AUTH] Authorize error");
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
