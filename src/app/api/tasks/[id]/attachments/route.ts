import { NextRequest } from "next/server";
import { Task } from "@/models/Task";
import { getCurrentUser } from "@/lib/auth/session";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/apiResponse";
import { canViewInternalContent } from "@/lib/auth/permissions";
import { logActivity } from "@/lib/utils/activityLog";
import { z } from "zod";

const attachmentSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileUrl: z.string().min(1),
  fileSize: z.number().nonnegative(),
  mimeType: z.string().min(1),
  isPrivate: z.boolean().optional().default(false),
});

/**
 * POST /api/tasks/:id/attachments
 * Links an already-uploaded file (via /api/uploads) to a task.
 * Two-step flow (upload, then attach) keeps the upload endpoint generic
 * and reusable for both task attachments and comment attachments.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const task = await Task.findOne({ _id: id, organizationId: user.organizationId });
    if (!task) return apiError("Task not found", 404);

    const body = await req.json();
    const data = attachmentSchema.parse(body);

    if (data.isPrivate && !canViewInternalContent(user.role)) {
      return apiError("You do not have permission to mark attachments private.", 403);
    }

    task.attachments.push({
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      uploadedBy: user._id,
      uploadedAt: new Date(),
      isPrivate: data.isPrivate,
    });

    await task.save();

    await logActivity({
      organizationId: user.organizationId,
      taskId: task._id,
      actorId: user._id,
      action: "attachment_added",
      metadata: { fileName: data.fileName, isPrivate: data.isPrivate },
    });

    return apiSuccess(task.attachments[task.attachments.length - 1], 201);
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * GET /api/tasks/:id/attachments
 * Lists attachments, filtering out private ones for users who
 * shouldn't see them (mirrors the managerNotes-stripping pattern
 * used on the main task GET route).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const task = await Task.findOne({ _id: id, organizationId: user.organizationId })
      .populate("attachments.uploadedBy", "name")
      .select("attachments");
    if (!task) return apiError("Task not found", 404);

    const canSeePrivate = canViewInternalContent(user.role);
    const attachments = canSeePrivate
      ? task.attachments
      : task.attachments.filter((a) => !a.isPrivate);

    return apiSuccess(attachments);
  } catch (err) {
    return handleApiError(err);
  }
}
