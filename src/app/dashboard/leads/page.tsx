import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LeadsPageClient from "./leads-page-client";

export default async function LeadsPage() {
  const session = await auth();

  if (!session?.user?.isBackoffice) {
    redirect("/dashboard");
  }

  return <LeadsPageClient />;
}
