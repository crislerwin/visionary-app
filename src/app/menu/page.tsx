import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function MenuRedirectPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  // Get user's tenant
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    include: { tenant: true },
    orderBy: { joinedAt: "desc" },
  });

  if (!membership) {
    redirect("/setup");
  }

  redirect(`/menu/${membership.tenant.slug}`);
}
