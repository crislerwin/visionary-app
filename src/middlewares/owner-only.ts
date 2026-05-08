import { auth } from "@/auth";
import { type NextRequest, NextResponse } from "next/server";

const OWNER_DOMAIN = "@reactivesoftware.com.br";

export async function ownerOnlyMiddleware(_request: NextRequest): Promise<NextResponse | null> {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized - authentication required" }, { status: 401 });
  }

  if (!session.user.email.toLowerCase().endsWith(OWNER_DOMAIN)) {
    return NextResponse.json({ error: "Forbidden - owner access only" }, { status: 403 });
  }

  // User is owner, allow request to continue
  return null;
}

export function isOwner(email: string | null | undefined): boolean {
  return email?.toLowerCase().endsWith(OWNER_DOMAIN) ?? false;
}
