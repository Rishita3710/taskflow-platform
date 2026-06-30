import { Task } from "@/models/Task";
import { getCurrentUser } from "@/lib/auth/session";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/apiResponse";

/**
 * GET /api/tasks/:id/subtasks
 * Lists tasks whose parentTaskId points to this task.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const parent = await Task.findOne({ _id: id, organizationId: user.organizationId });
    if (!parent) return apiError("Task not found", 404);

    const subtasks = await Task.find({ parentTaskId: id, organizationId: user.organizationId })
      .select("title status priority dueDate assigneeIds")
      .populate("assigneeIds", "name")
      .sort({ createdAt: 1 })
      .lean();

    return apiSuccess(subtasks);
  } catch (err) {
    return handleApiError(err);
  }
}
