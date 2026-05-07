import Link from "next/link";

import { cn } from "@/lib/utils";

interface MainNavProps {
  className?: string;
}

export function MainNav({ className }: MainNavProps) {
  return (
    <div className={cn("flex items-center space-x-4 lg:space-x-6", className)}>
      <Link href="/dashboard" className="text-sm font-medium transition-colors hover:text-primary">
        Dashboard
      </Link>
      <Link
        href="/dashboard/posts"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Posts
      </Link>
      <Link
        href="/dashboard/team"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Team
      </Link>
    </div>
  );
}
