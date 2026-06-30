import { ActivityLog } from "@/models/ActivityLog";
import { Task } from "@/models/Task";
import { getCurrentUser } from "@/lib/auth/session";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/apiResponse";

/**
 * GET /api/tasks/:id/activity
 * Returns the append-only audit trail for a task — powers the
 * Activity Timeline UI feature.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const task = await Task.findOne({ _id: id, organizationId: user.organizationId });
    if (!task) return apiError("Task not found", 404);

    const activity = await ActivityLog.find({ taskId: id })
      .sort({ createdAt: 1 })
      .populate("actorId", "name role")
      .lean();

    return apiSuccess(activity);
  } catch (err) {
    return handleApiError(err);
  }
}
