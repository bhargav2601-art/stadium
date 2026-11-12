import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AppError } from "@/server/errors";
import { assertSameOrigin, jsonError, requireUser } from "@/server/guards";

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const MAX_BYTES = 2 * 1024 * 1024;

function matchesImageSignature(bytes: Uint8Array, mime: string) {
  if (mime === "image/png") {
    return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  }
  if (mime === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mime === "image/webp") {
    return (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }
  return false;
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const formData = await request.formData();
    const file = formData.get("avatar");
    if (!(file instanceof File)) {
      throw new AppError("Select a PNG, JPEG, or WebP image file.");
    }
    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      throw new AppError("Only PNG, JPEG, and WebP images are allowed.");
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      throw new AppError("Avatar image must be under 2 MB.");
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    if (!matchesImageSignature(buffer, file.type)) {
      throw new AppError("Uploaded file content does not match its image type.");
    }

    const dir = join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    const filename = `avatar_${user.id}_${randomBytes(6).toString("hex")}.${ext}`;
    await writeFile(join(dir, filename), buffer);

    const avatarUrl = `/uploads/${filename}`;
    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl },
    });
    return NextResponse.json({ avatarUrl });
  } catch (error) {
    return jsonError(error);
  }
}
