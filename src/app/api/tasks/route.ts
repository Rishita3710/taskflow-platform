import { NextRequest } from "next/server";
import { Task } from "@/models/Task";
import { getCurrentUser } from "@/lib/auth/session";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/apiResponse";
import { createTaskSchema } from "@/lib/utils/validation";
import { buildTaskVisibilityFilter } from "@/lib/utils/taskVisibility";
import { can } from "@/lib/auth/permissions";
import { logActivity } from "@/lib/utils/activityLog";
import { notifyUsers } from "@/lib/utils/notify";

/**
 * GET /api/tasks
 * Lists tasks visible to the current user, with optional filters:
 *   ?status=in_progress&priority=high&assignee=<id>&search=keyword&page=1&limit=20
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assignee = searchParams.get("assignee");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "20", 10));

    const filter: Record<string, unknown> = buildTaskVisibilityFilter(user);

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignee) filter.assigneeIds = assignee;
    if (search) filter.$text = { $search: search };

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .sort({ dueDate: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("assigneeIds", "name email avatarUrl")
        .populate("createdBy", "name email")
        .lean(),
      Task.countDocuments(filter),
    ]);

    return apiSuccess({
      tasks,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/tasks
 * Creates a new task. Only roles with "task:create" permission may do this
 * (super_admin, manager, team_lead per the RBAC matrix).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!can(user.role, "task:create")) {
      return apiError("You do not have permission to create tasks.", 403);
    }

    const body = await req.json();
    const data = createTaskSchema.parse(body);

    if (data.visibility === "confidential" && !can(user.role, "task:set_visibility")) {
      return apiError("You do not have permission to set confidential visibility.", 403);
    }

    const task = await Task.create({
      title: data.title,
      description: data.description,
      organizationId: user.organizationId,
      teamId: data.teamId || user.teamId,
      createdBy: user._id,
      assigneeIds: data.assigneeIds,
      parentTaskId: data.parentTaskId,
      isSubtask: Boolean(data.parentTaskId),
      priority: data.priority,
      visibility: data.visibility,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      tags: data.tags,
      recurrence: data.recurrence
        ? {
            frequency: data.recurrence.frequency,
            interval: data.recurrence.interval,
            endDate: data.recurrence.endDate ? new Date(data.recurrence.endDate) : undefined,
          }
        : undefined,
      isRecurringTemplate: Boolean(data.recurrence),
    });

    await logActivity({
      organizationId: user.organizationId,
      taskId: task._id,
      actorId: user._id,
      action: "task_created",
    });

    await notifyUsers({
      organizationId: user.organizationId,
      userIds: data.assigneeIds,
      type: "task_assigned",
      message: `${user.name} assigned you a new task: "${task.title}"`,
      taskId: task._id,
      triggeredBy: user._id,
    });

    return apiSuccess(task, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
