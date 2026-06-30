import { NextRequest } from "next/server";
import { z } from "zod";
import { User } from "@/models/User";
import { getCurrentUser } from "@/lib/auth/session";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/apiResponse";
import { can } from "@/lib/auth/permissions";

const updateSchema = z.object({
  role: z.enum(["manager", "team_lead", "employee"]).optional(),
  isActive: z.boolean().optional(),
});

/**
 * PATCH /api/users/:id
 * Manager/Admin can update a team member's role or deactivate them.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    const { id } = await params;

    if (!can(currentUser.role, "user:manage_roles")) {
      return apiError("You do not have permission to update team members.", 403);
    }

    // Can't edit yourself
    if (id === currentUser.id.toString()) {
      return apiError("You cannot change your own role or status.", 400);
    }

    const target = await User.findOne({
      _id: id,
      organizationId: currentUser.organizationId,
    });

    if (!target) return apiError("User not found.", 404);

    const body = await req.json();
    const data = updateSchema.parse(body);

    if (data.role !== undefined) {
      if (data.role === "manager" && currentUser.role !== "super_admin") {
        return apiError("Only Super Admin can assign the Manager role.", 403);
      }
      target.role = data.role;
    }

    if (data.isActive !== undefined) {
      target.isActive = data.isActive;
    }

    await target.save();

    return apiSuccess({
      id: target.id,
      name: target.name,
      email: target.email,
      role: target.role,
      isActive: target.isActive,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
