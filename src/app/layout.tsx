import type { Metadata } from "next";

import { Providers } from "./providers";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Visionary - Financial Intelligence Platform",
  description:
    "A multi-tenant financial management platform built with Next.js, TypeScript, Prisma, tRPC, and NextAuth.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="h-screen overflow-hidden bg-background font-sans antialiased"
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
