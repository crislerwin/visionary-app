import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { createStorageProvider, getStorageConfig } from "@/lib/storage";
import { NextResponse } from "next/server";

const storage = createStorageProvider(getStorageConfig());

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    logger.info({ userId: session.user.id, hasFile: !!file }, "[Upload] Request received");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 });
    }

    logger.info({ name: file.name, type: file.type, size: file.size }, "[Upload] File info");

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `${session.user.id}/${timestamp}_${sanitizedFilename}`;

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
