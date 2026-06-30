import type { UserRole } from "@/models/User";
import type { TaskVisibility } from "@/models/Task";

/**
 * RBAC PERMISSION MATRIX
 * ----------------------
 * This is the single source of truth for "who can do what."
 * Every API route imports `can()` from here instead of writing
 * inline if/else role checks, so the rules stay consistent and
 * are easy to audit in one place.
 *
 * Role hierarchy (high to low): super_admin > manager > team_lead > employee
 */

export type Permission =
  | "task:create"
  | "task:assign"
  | "task:delete"
  | "task:edit_any" // edit any task regardless of creator
  | "task:edit_own" // edit tasks you created or are assigned
  | "task:view_confidential"
  | "task:set_visibility"
  | "task:approve"
  | "task:set_manager_notes"
  | "comment:post_internal" // manager-only / internal discussion
  | "comment:delete_any"
  | "user:invite"
  | "user:manage_roles"
  | "team:manage"
  | "org:manage_settings"
  | "audit:view"
  | "dashboard:view_team_analytics";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    "task:create",
    "task:assign",
    "task:delete",
    "task:edit_any",
    "task:edit_own",
    "task:view_confidential",
    "task:set_visibility",
    "task:approve",
    "task:set_manager_notes",
    "comment:post_internal",
    "comment:delete_any",
    "user:invite",
    "user:manage_roles",
    "team:manage",
    "org:manage_settings",
    "audit:view",
    "dashboard:view_team_analytics",
  ],
  manager: [
    "task:create",
    "task:assign",
    "task:delete",
    "task:edit_any",
    "task:edit_own",
    "task:view_confidential",
    "task:set_visibility",
    "task:approve",
    "task:set_manager_notes",
    "comment:post_internal",
    "comment:delete_any",
    "user:invite",
    "team:manage",
    "audit:view",
    "dashboard:view_team_analytics",
  ],
  team_lead: [
    "task:create",
    "task:assign",
    "task:edit_own",
    "task:set_visibility",
    "task:approve",
    "task:set_manager_notes",
    "comment:post_internal",
    "dashboard:view_team_analytics",
  ],
  employee: ["task:edit_own"],
};

export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAny(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}

/**
 * Visibility rules: can this user see a task with the given visibility,
 * given their role and whether they are an assignee/watcher/team member?
 */
export function canViewTaskByVisibility(params: {
  role: UserRole;
  visibility: TaskVisibility;
  isAssigneeOrWatcher: boolean;
  isSameTeam: boolean;
  isCreator: boolean;
}): boolean {
  const { role, visibility, isAssigneeOrWatcher, isSameTeam, isCreator } = params;

  if (role === "super_admin" || role === "manager") return true;
  if (isCreator) return true;

  switch (visibility) {
    case "public":
      return true;
    case "team_only":
      return isSameTeam || isAssigneeOrWatcher;
    case "private":
      return isAssigneeOrWatcher;
    case "confidential":
      // confidential tasks are visible only to assignees explicitly added,
      // never inferred via team membership
      return isAssigneeOrWatcher && (role === "team_lead" || isAssigneeOrWatcher);
    default:
      return false;
  }
}

/**
 * Whether a user can see "internal" comments (manager-only discussion)
 * and manager notes on a task.
 */
export function canViewInternalContent(role: UserRole): boolean {
  return role === "super_admin" || role === "manager" || role === "team_lead";
}
