import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { Task } from "@/models/Task";
import { getCurrentUser } from "@/lib/auth/session";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/apiResponse";
import { can, canViewTaskByVisibility, canViewInternalContent } from "@/lib/auth/permissions";
import { logActivity } from "@/lib/utils/activityLog";

async function loadTaskOrThrow(id: string, organizationId: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(new Error("Invalid task id"), { status: 400 });
  }
  const task = await Task.findOne({ _id: id, organizationId })
    .populate("assigneeIds", "name email avatarUrl role")
    .populate("watcherIds", "name email")
    .populate("createdBy", "name email");
  if (!task) {
    throw Object.assign(new Error("Task not found"), { status: 404 });
  }
  return task;
}

/**
 * GET /api/tasks/:id
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const task = await loadTaskOrThrow(id, user.organizationId.toString());

    const isAssigneeOrWatcher =
      task.assigneeIds.some((a) => a.id?.toString() === user.id.toString()) ||
      task.watcherIds.some((w) => w.id?.toString() === user.id.toString());
    const isSameTeam = task.teamId?.toString() === user.teamId?.toString();
    const isCreator = task.createdBy.id?.toString() === user.id.toString();

    const visible = canViewTaskByVisibility({
      role: user.role,
      visibility: task.visibility,
      isAssigneeOrWatcher,
      isSameTeam,
      isCreator,
    });

    if (!visible) {
      return apiError("You do not have access to this task.", 403);
    }

    const taskObj = task.toObject();

    // strip manager-only notes from employee view
    if (!canViewInternalContent(user.role)) {
      delete (taskObj as unknown as Record<string, unknown>).managerNotes;
    }

    return apiSuccess(taskObj);
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * PATCH /api/tasks/:id
 * Generic field update (title, description, priority, dueDate, visibility, managerNotes, etc).
 * Status changes go through /api/tasks/:id/status to keep workflow transitions auditable.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const task = await loadTaskOrThrow(id, user.organizationId.toString());

    const isCreator = task.createdBy.id?.toString() === user.id.toString();
    const isAssignee = task.assigneeIds.some((a) => a.id?.toString() === user.id.toString());

    const canEdit = can(user.role, "task:edit_any") || (can(user.role, "task:edit_own") && (isCreator || isAssignee));
    if (!canEdit) {
      return apiError("You do not have permission to edit this task.", 403);
    }

    const body = await req.json();
    const allowedFields = ["title", "description", "priority", "dueDate", "startDate", "tags"];
    const managerOnlyFields = ["visibility", "managerNotes", "teamId"];

    for (const field of allowedFields) {
      if (field in body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (task as any)[field] = body[field];
      }
    }

    for (const field of managerOnlyFields) {
      if (field in body) {
        if (field === "visibility" && !can(user.role, "task:set_visibility")) {
          return apiError("You do not have permission to change visibility.", 403);
        }
        if (field === "managerNotes" && !can(user.role, "task:set_manager_notes")) {
          return apiError("You do not have permission to set manager notes.", 403);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (task as any)[field] = body[field];
      }
    }

    await task.save();

    await logActivity({
      organizationId: user.organizationId,
      taskId: task._id,
      actorId: user._id,
      action: "task_updated",
      metadata: { fields: Object.keys(body) },
    });

    return apiSuccess(task);
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * DELETE /api/tasks/:id
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!can(user.role, "task:delete")) {
      return apiError("You do not have permission to delete tasks.", 403);
    }

    const task = await loadTaskOrThrow(id, user.organizationId.toString());
    await Task.deleteOne({ _id: task._id });

    return apiSuccess({ message: "Task deleted" });
  } catch (err) {
    return handleApiError(err);
  }
}
