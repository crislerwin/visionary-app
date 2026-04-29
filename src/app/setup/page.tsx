import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { SetupForm } from "./setup-form";

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <SetupForm />
    </div>
  );
}
