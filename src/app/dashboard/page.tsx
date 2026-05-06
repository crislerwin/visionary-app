import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  // Get user's tenants directly from Prisma
  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    include: { tenant: true },
    orderBy: { joinedAt: "desc" },
  });

  const tenants = memberships.map((m) => ({
    ...m.tenant,
    role: m.role,
  }));

  if (tenants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <h1 className="text-2xl font-bold">Welcome to Visionary</h1>
        <p className="text-muted-foreground">
          You don&apos;t have any tenants yet. Create one to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.user?.name || session.user?.email}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold">Your Tenants</h3>
          <p className="text-2xl font-bold mt-2">{tenants.length}</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold">Active Tenant</h3>
          <p className="text-lg font-medium mt-2 truncate">
            {tenants[0]?.name}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold">Role</h3>
          <p className="text-lg font-medium mt-2 capitalize">
            {tenants[0]?.role?.toLowerCase()}
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h3 className="font-semibold mb-4">Quick Links</h3>
        <div className="grid gap-2">
          <a
            href="/dashboard/posts"
            className="flex items-center p-3 rounded-md hover:bg-muted transition-colors"
          >
            <span className="font-medium">Posts</span>
            <span className="ml-auto text-muted-foreground">
              Manage your posts
            </span>
          </a>
          <a
            href="/dashboard/team"
            className="flex items-center p-3 rounded-md hover:bg-muted transition-colors"
          >
            <span className="font-medium">Team</span>
            <span className="ml-auto text-muted-foreground">
              Manage team members
            </span>
          </a>
          <a
            href="/dashboard/settings"
            className="flex items-center p-3 rounded-md hover:bg-muted transition-colors"
          >
            <span className="font-medium">Settings</span>
            <span className="ml-auto text-muted-foreground">
              Tenant settings
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
