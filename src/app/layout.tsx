import type { Metadata } from "next";
import Script from "next/script";

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
    <html lang="en">
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Safe hardcoded theme script
          dangerouslySetInnerHTML={{
            __html: `
                      try {
                          const stored = localStorage.getItem('theme');
                          const theme = stored || 'system';
                          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                          const resolved = theme === 'system' ? systemTheme : theme;
                          document.documentElement.classList.add(resolved);
                          document.documentElement.style.colorScheme = resolved;
                      } catch (e) {}
                      `,
          }}
        />
      </head>
      <body className="h-screen overflow-hidden bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
