import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";

import { Providers } from "./providers";
import "@/app/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Food Service - Cardápio Digital, Pedidos e PDV",
  description:
    "Cardápio digital com QR Code, pedidos online e PDV — tudo em uma única plataforma feita para restaurantes, lanchonetes e food trucks no Brasil.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${fraunces.variable} min-h-screen bg-background font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
