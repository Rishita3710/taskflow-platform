import { NextRequest } from "next/server";
import { Task, type TaskStatus } from "@/models/Task";
import { Comment } from "@/models/Comment";
import { getCurrentUser } from "@/lib/auth/session";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/apiResponse";
import { updateTaskStatusSchema } from "@/lib/utils/validation";
import { logActivity } from "@/lib/utils/activityLog";
import { notifyUsers } from "@/lib/utils/notify";

/**
 * Valid status transitions. Keeps the workflow predictable: e.g. you
 * can't jump straight from "todo" to "completed" without going through
 * review, and "completed"/"rejected" tasks can only move via "reopened".
 */
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ["in_progress", "need_clarification"],
  in_progress: ["need_clarification", "under_review", "todo"],
  need_clarification: ["in_progress", "todo"],
  under_review: ["completed", "rejected", "in_progress"],
  completed: ["reopened"],
  rejected: ["reopened", "in_progress"],
  reopened: ["in_progress", "todo"],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const task = await Task.findOne({ _id: id, organizationId: user.organizationId });
    if (!task) return apiError("Task not found", 404);

    const body = await req.json();
    const data = updateTaskStatusSchema.parse(body);

    const allowedNext = VALID_TRANSITIONS[task.status] || [];
    if (!allowedNext.includes(data.status)) {
      return apiError(
        `Cannot move task from "${task.status}" to "${data.status}". Allowed: ${allowedNext.join(", ") || "none"}`,
        422
      );
    }

    const previousStatus = task.status;
    task.status = data.status;
    if (data.status === "completed") {
      task.completedAt = new Date();
    }
    await task.save();

    await logActivity({
      organizationId: user.organizationId,
      taskId: task._id,
      actorId: user._id,
      action: "status_changed",
      metadata: { from: previousStatus, to: data.status },
    });

    // Auto-post a system comment so the status change is visible in the
    // discussion thread, keeping the "everything attached to the task" promise.
    if (data.comment) {
      await Comment.create({
        taskId: task._id,
        organizationId: user.organizationId,
        authorId: user._id,
        body: data.comment,
        isClarificationRequest: data.status === "need_clarification",
      });
    }

    const recipients = [
      task.createdBy.toString(),
      ...task.assigneeIds.map((a) => a.toString()),
      ...task.watcherIds.map((w) => w.toString()),
    ];

    await notifyUsers({
      organizationId: user.organizationId,
      userIds: recipients,
      type: "status_changed",
      message: `${user.name} changed task "${task.title}" status to ${data.status.replace("_", " ")}`,
      taskId: task._id,
      triggeredBy: user._id,
    });

    return apiSuccess(task);
  } catch (err) {
    return handleApiError(err);
  }
}
