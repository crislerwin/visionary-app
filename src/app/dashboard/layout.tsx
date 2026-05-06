import { auth } from "@/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { redirect } from "next/navigation";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth();

  if (!session) {
    redirect("/sign-in");
  }

  return <DashboardShell className="flex flex-col">{children}</DashboardShell>;
}
