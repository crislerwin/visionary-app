import { auth } from "@/auth";
import { isBackofficeUser } from "@/lib/backoffice";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { SetupForm } from "./setup-form";
import { WaitingAccess } from "./waiting-access";

export default async function SetupPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
  });

  if (membership) {
    redirect("/dashboard");
  }

  const isBackoffice = isBackofficeUser(session.user.email);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {isBackoffice ? <SetupForm /> : <WaitingAccess />}
    </div>
  );
}
