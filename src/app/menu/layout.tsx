import type { ReactNode } from "react";
import { TRPCReactProvider } from "@/lib/trpc/react";

export default function MenuLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <TRPCReactProvider>
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    </TRPCReactProvider>
  );
}
