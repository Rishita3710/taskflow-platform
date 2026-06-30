import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";
import { getCurrentUser } from "@/lib/auth/session";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/apiResponse";

/**
 * POST /api/uploads
 * Accepts a multipart/form-data file upload, stores it on local disk
 * under public/uploads/<organizationId>/, and returns the public URL
 * plus metadata to attach to a Task or Comment.
 *
 * NOTE: this is a local-disk implementation for development/portfolio
 * use. In production, swap writeFile for an S3 (or similar) upload —
 * the function signature/response shape can stay identical so nothing
 * else in the app needs to change.
 */

const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || "10", 10);
const ALLOWED_MIME_PREFIXES = ["image/", "application/pdf", "text/", "application/msword", "application/vnd.", "application/zip"];

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return apiError("No file provided. Send it as form field 'file'.", 400);
    }

    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_FILE_SIZE_MB) {
      return apiError(`File too large. Max size is ${MAX_FILE_SIZE_MB}MB.`, 413);
    }

    const isAllowed = ALLOWED_MIME_PREFIXES.some((prefix) => file.type.startsWith(prefix));
    if (!isAllowed) {
      return apiError(`File type "${file.type}" is not allowed.`, 415);
    }

    const orgId = user.organizationId.toString();
    const uploadDir = path.join(process.cwd(), "public", "uploads", orgId);
    await mkdir(uploadDir, { recursive: true });

    const safeExt = path.extname(file.name).slice(0, 10);
    const storedName = `${nanoid(12)}${safeExt}`;
    const fullPath = path.join(uploadDir, storedName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(fullPath, buffer);

    const fileUrl = `/uploads/${orgId}/${storedName}`;

    return apiSuccess(
      {
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type,
      },
      201
    );
  } catch (err) {
    return handleApiError(err);
  }
}
