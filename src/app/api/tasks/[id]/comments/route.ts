import { NextRequest } from "next/server";
import { Task } from "@/models/Task";
import { Comment } from "@/models/Comment";
import { getCurrentUser } from "@/lib/auth/session";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/apiResponse";
import { createCommentSchema } from "@/lib/utils/validation";
import { canViewInternalContent } from "@/lib/auth/permissions";
import { logActivity } from "@/lib/utils/activityLog";
import { notifyUsers } from "@/lib/utils/notify";
import { getIO } from "@/lib/socket/emit";

/**
 * GET /api/tasks/:id/comments
 * Returns the full discussion thread for a task, in chronological
 * order, with internal/manager-only comments filtered out for
 * employees who shouldn't see them.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const task = await Task.findOne({ _id: id, organizationId: user.organizationId });
    if (!task) return apiError("Task not found", 404);

    const filter: Record<string, unknown> = {
      taskId: id,
      deletedAt: { $exists: false },
    };

    if (!canViewInternalContent(user.role)) {
      filter.isInternal = false;
    }

    const comments = await Comment.find(filter)
      .sort({ createdAt: 1 })
      .populate("authorId", "name email avatarUrl role")
      .populate("mentions", "name email")
      .lean();

    return apiSuccess(comments);
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/tasks/:id/comments
 * Posts a new message into the task's discussion thread. Supports
 * threaded replies (parentCommentId), @mentions, internal/manager-only
 * flag, "clarification request" flag (Need Help / Ask Before Calling),
 * and marking a message as a recorded decision for the knowledge base.
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
    const data = createCommentSchema.parse(body);

    if (data.isInternal && !canViewInternalContent(user.role)) {
      return apiError("You do not have permission to post internal comments.", 403);
    }

    const comment = await Comment.create({
      taskId: task._id,
      organizationId: user.organizationId,
      authorId: user._id,
      body: data.body,
      parentCommentId: data.parentCommentId,
      mentions: data.mentions,
      isInternal: data.isInternal,
      isClarificationRequest: data.isClarificationRequest,
      isDecision: data.isDecision,
      attachments: data.attachments,
    });

    // If this is a clarification request, flip task status automatically
    // so it surfaces on manager dashboards without a separate manual step.
    if (data.isClarificationRequest && task.status !== "need_clarification") {
      task.status = "need_clarification";
      await task.save();
      await logActivity({
        organizationId: user.organizationId,
        taskId: task._id,
        actorId: user._id,
        action: "status_changed",
        metadata: { from: task.status, to: "need_clarification", reason: "clarification_requested" },
      });
    }

    await logActivity({
      organizationId: user.organizationId,
      taskId: task._id,
      actorId: user._id,
      action: "comment_posted",
      metadata: { commentId: comment._id, isInternal: data.isInternal },
    });

    // Notify: task participants get "comment_added", @mentioned users get "mentioned"
    const participantIds = new Set<string>([
      task.createdBy.toString(),
      ...task.assigneeIds.map((a) => a.toString()),
      ...task.watcherIds.map((w) => w.toString()),
    ]);

    await notifyUsers({
      organizationId: user.organizationId,
      userIds: Array.from(participantIds),
      type: data.isClarificationRequest ? "clarification_requested" : "comment_added",
      message: `${user.name} commented on "${task.title}"`,
      taskId: task._id,
      commentId: comment._id,
      triggeredBy: user._id,
    });

    if (data.mentions.length > 0) {
      await notifyUsers({
        organizationId: user.organizationId,
        userIds: data.mentions,
        type: "mentioned",
        message: `${user.name} mentioned you on "${task.title}"`,
        taskId: task._id,
        commentId: comment._id,
        triggeredBy: user._id,
      });
    }

    // Real-time push to anyone viewing this task's discussion thread right now.
    const io = getIO();
    if (io) {
      io.to(`task:${task._id}`).emit("comment:new", {
        taskId: task._id.toString(),
        comment,
      });
    }

    const populated = await comment.populate([
      { path: "authorId", select: "name email avatarUrl role" },
      { path: "mentions", select: "name email" },
    ]);

    return apiSuccess(populated, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
