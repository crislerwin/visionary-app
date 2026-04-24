import type { Metadata } from "next";

import { Providers } from "./providers";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "SaaS Boilerplate - Multi-tenant Next.js Starter",
  description:
    "A complete SaaS boilerplate with Next.js, TypeScript, Prisma, tRPC, and NextAuth.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
