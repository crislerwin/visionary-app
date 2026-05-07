import { auth } from "@/auth";
import { isBackofficeUser } from "@/lib/backoffice";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { createStorageProvider, getStorageConfig } from "@/lib/storage";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const storage = createStorageProvider(getStorageConfig());
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const tenantId = formData.get("tenantId") as string | null;

    logger.info(
      { userId: session.user.id, hasFile: !!file, tenantId },
      "[Upload] Request received",
    );

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 });
    }

    // Verify user belongs to the tenant (or is backoffice)
    const isBackoffice = isBackofficeUser(session.user.email);
    if (!isBackoffice) {
      const membership = await prisma.membership.findFirst({
        where: { userId: session.user.id, tenantId },
      });
      if (!membership) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    logger.info({ name: file.name, type: file.type, size: file.size }, "[Upload] File info");

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `${tenantId}/${timestamp}_${sanitizedFilename}`;

    logger.info({ key, provider: process.env.STORAGE_PROVIDER }, "[Upload] Uploading to storage");

    const publicUrl = await storage.upload(buffer, key, file.type);

    logger.info({ publicUrl, key }, "[Upload] Success");

    return NextResponse.json({ url: publicUrl, key });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ err: error, message: errorMessage }, "[Upload] Error");
    return NextResponse.json(
      { error: "Failed to upload file", details: errorMessage },
      { status: 500 },
    );
  }
}
