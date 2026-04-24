import { cookies, headers } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/db";

export const getTenantContext = cache(async () => {
  const headersList = await headers();
  const cookiesList = await cookies();
  
  // Try to get tenant from cookie first (for session persistence)
  const tenantSlug = cookiesList.get("current-tenant")?.value;
  
  if (tenantSlug) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    if (tenant) {
      return tenant;
    }
  }

  // Try to get tenant from subdomain or header
  const host = headersList.get("host");
  if (host) {
    const subdomain = host.split(".")[0];
    if (subdomain && subdomain !== "www" && subdomain !== "localhost") {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: subdomain },
      });
      if (tenant) {
        return tenant;
      }
    }
  }

  return null;
});
