import { NextRequest } from "next/server";
import { Task } from "@/models/Task";
import { Comment } from "@/models/Comment";
import { getCurrentUser } from "@/lib/auth/session";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/apiResponse";
import { approvalSchema } from "@/lib/utils/validation";
import { can } from "@/lib/auth/permissions";
import { logActivity } from "@/lib/utils/activityLog";
import { notifyUsers } from "@/lib/utils/notify";

/**
 * PATCH /api/tasks/:id/approve
 * Manager/team_lead approves, rejects, or requests changes on a task
 * that an employee has submitted (status must be "under_review").
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!can(user.role, "task:approve")) {
      return apiError("You do not have permission to approve tasks.", 403);
    }

    const task = await Task.findOne({ _id: id, organizationId: user.organizationId });
    if (!task) return apiError("Task not found", 404);

    if (task.status !== "under_review") {
      return apiError('Task must be in "under_review" status to be approved/rejected.', 422);
    }

    const body = await req.json();
    const data = approvalSchema.parse(body);

    task.approvalStatus = data.decision;
    task.approvedBy = user._id;
    task.approvalNote = data.note;

    if (data.decision === "approved") {
      task.status = "completed";
      task.completedAt = new Date();
    } else if (data.decision === "rejected") {
      task.status = "rejected";
    } else {
      task.status = "in_progress"; // changes requested -> back to work
    }

    await task.save();

    await logActivity({
      organizationId: user.organizationId,
      taskId: task._id,
      actorId: user._id,
      action:
        data.decision === "approved"
          ? "approved"
          : data.decision === "rejected"
          ? "rejected"
          : "changes_requested",
      metadata: { note: data.note },
    });

    if (data.note) {
      await Comment.create({
        taskId: task._id,
        organizationId: user.organizationId,
        authorId: user._id,
        body: data.note,
        isDecision: true,
      });
    }

    await notifyUsers({
      organizationId: user.organizationId,
      userIds: task.assigneeIds.map((a) => a.toString()),
      type: data.decision === "approved" ? "task_approved" : "task_rejected",
      message: `${user.name} ${data.decision.replace("_", " ")} task "${task.title}"`,
      taskId: task._id,
      triggeredBy: user._id,
    });

    return apiSuccess(task);
  } catch (err) {
    return handleApiError(err);
  }
}
