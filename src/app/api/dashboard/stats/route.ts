import { Task } from "@/models/Task";
import { getCurrentUser } from "@/lib/auth/session";
import { apiSuccess, handleApiError } from "@/lib/utils/apiResponse";
import { buildTaskVisibilityFilter } from "@/lib/utils/taskVisibility";
import { can } from "@/lib/auth/permissions";
import mongoose from "mongoose";

/**
 * GET /api/dashboard/stats
 * Returns role-appropriate dashboard numbers:
 *  - Manager/team_lead/super_admin: org-wide totals + team breakdown
 *  - Employee: their own assigned/pending/overdue/clarification counts
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    const now = new Date();

    const visibilityFilter = buildTaskVisibilityFilter(user);
    const isManagerView = can(user.role, "dashboard:view_team_analytics");

    const [
      total,
      pending,
      needClarification,
      overdue,
      completed,
      byStatus,
    ] = await Promise.all([
      Task.countDocuments(visibilityFilter),
      Task.countDocuments({
        ...visibilityFilter,
        status: { $in: ["todo", "in_progress", "under_review", "reopened"] },
      }),
      Task.countDocuments({ ...visibilityFilter, status: "need_clarification" }),
      Task.countDocuments({
        ...visibilityFilter,
        dueDate: { $lt: now },
        status: { $nin: ["completed", "rejected"] },
      }),
      Task.countDocuments({ ...visibilityFilter, status: "completed" }),
      Task.aggregate([
        { $match: visibilityFilter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const base = {
      total,
      pending,
      needClarification,
      overdue,
      completed,
      byStatus: byStatus.reduce(
        (acc: Record<string, number>, row: { _id: string; count: number }) => {
          acc[row._id] = row.count;
          return acc;
        },
        {}
      ),
    };

    if (!isManagerView) {
      // Employee dashboard: surface what needs THEIR attention right now —
      // upcoming deadlines and anything flagged urgent/high priority.
      const [myUpcoming, myUrgent] = await Promise.all([
        Task.find({
          ...visibilityFilter,
          status: { $nin: ["completed", "rejected"] },
          dueDate: { $exists: true, $ne: null },
        })
          .sort({ dueDate: 1 })
          .limit(5)
          .select("title status priority dueDate")
          .lean(),
        Task.find({
          ...visibilityFilter,
          status: { $nin: ["completed", "rejected"] },
          priority: { $in: ["high", "urgent"] },
        })
          .sort({ createdAt: -1 })
          .limit(5)
          .select("title status priority dueDate")
          .lean(),
      ]);

      return apiSuccess({ scope: "personal", ...base, myUpcoming, myUrgent });
    }

    // Manager view: things actively needing the manager's attention right now.
    const [needsApproval, needsClarificationList, recentlyOverdue] = await Promise.all([
      Task.find({
        organizationId: user.organizationId,
        status: "under_review",
      })
        .sort({ updatedAt: -1 })
        .limit(8)
        .populate("assigneeIds", "name")
        .select("title status priority dueDate assigneeIds")
        .lean(),
      Task.find({
        organizationId: user.organizationId,
        status: "need_clarification",
      })
        .sort({ updatedAt: -1 })
        .limit(8)
        .populate("assigneeIds", "name")
        .select("title status priority dueDate assigneeIds")
        .lean(),
      Task.find({
        organizationId: user.organizationId,
        dueDate: { $lt: now },
        status: { $nin: ["completed", "rejected"] },
      })
        .sort({ dueDate: 1 })
        .limit(8)
        .populate("assigneeIds", "name")
        .select("title status priority dueDate assigneeIds")
        .lean(),
    ]);

    // Manager view: team performance breakdown (tasks per assignee, completion rate)
    const teamPerformance = await Task.aggregate([
      { $match: { organizationId: new mongoose.Types.ObjectId(user.organizationId) } },
      { $unwind: "$assigneeIds" },
      {
        $group: {
          _id: "$assigneeIds",
          totalAssigned: { $sum: 1 },
          completedCount: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          overdueCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ["$dueDate", now] },
                    { $not: [{ $in: ["$status", ["completed", "rejected"]] }] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          userId: "$_id",
          name: "$user.name",
          totalAssigned: 1,
          completedCount: 1,
          overdueCount: 1,
          completionRate: {
            $cond: [
              { $eq: ["$totalAssigned", 0] },
              0,
              { $multiply: [{ $divide: ["$completedCount", "$totalAssigned"] }, 100] },
            ],
          },
        },
      },
      { $sort: { totalAssigned: -1 } },
    ]);

    return apiSuccess({
      scope: "team",
      ...base,
      teamPerformance,
      needsApproval,
      needsClarificationList,
      recentlyOverdue,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
