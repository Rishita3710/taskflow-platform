import { NextRequest } from "next/server";
import { z } from "zod";
import { Task } from "@/models/Task";
import { PersonalNote } from "@/models/PersonalNote";
import { getCurrentUser } from "@/lib/auth/session";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/apiResponse";

const noteSchema = z.object({ body: z.string().max(5000) });

/**
 * GET /api/tasks/:id/notes
 * Returns the CURRENT user's own private note for this task, if any.
 * There is no "list all notes" — by design, nobody (including
 * managers) can read another user's personal note.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const note = await PersonalNote.findOne({ taskId: id, userId: user._id });
    return apiSuccess(note || { body: "" });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * PUT /api/tasks/:id/notes
 * Creates or updates the current user's private note for this task
 * (upsert keyed on the unique userId+taskId index).
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const task = await Task.findOne({ _id: id, organizationId: user.organizationId });
    if (!task) return apiError("Task not found", 404);

    const body = await req.json();
    const data = noteSchema.parse(body);

    const note = await PersonalNote.findOneAndUpdate(
      { taskId: id, userId: user._id },
      { body: data.body, organizationId: user.organizationId },
      { upsert: true, new: true }
    );

    return apiSuccess(note);
  } catch (err) {
    return handleApiError(err);
  }
}
