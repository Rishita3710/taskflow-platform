import mongoose from "mongoose";
import type { IUser } from "@/models/User";

/**
 * Builds the Mongo filter that scopes a task list/search query to
 * only the tasks the requesting user is allowed to see. This is the
 * query-level enforcement of the visibility rules described in
 * src/lib/auth/permissions.ts (canViewTaskByVisibility), so we don't
 * fetch documents the user has no business seeing in the first place.
 */
export function buildTaskVisibilityFilter(user: IUser) {
  const baseOrgFilter = { organizationId: user.organizationId };

  // Super admins and managers see everything in their org.
  if (user.role === "super_admin" || user.role === "manager") {
    return baseOrgFilter;
  }

  const userId = new mongoose.Types.ObjectId(user.id);
  const orConditions: Record<string, unknown>[] = [
    { visibility: "public" },
    { createdBy: userId },
    { assigneeIds: userId },
    { watcherIds: userId },
  ];

  if (user.teamId) {
    orConditions.push({ visibility: "team_only", teamId: user.teamId });
  }

  return {
    ...baseOrgFilter,
    $or: orConditions,
  };
}
