import { NextRequest } from "next/server";
import { z } from "zod";
import { User } from "@/models/User";
import { getCurrentUser } from "@/lib/auth/session";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/apiResponse";
import { can } from "@/lib/auth/permissions";
import { hashPassword } from "@/lib/auth/password";

const inviteSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(6).max(72),
  role: z.enum(["manager", "team_lead", "employee"]),
});

/**
 * GET /api/users
 * Lists active users within the current user's organization.
 * Used to populate assignee pickers and @mention autocomplete.
 * Intentionally returns only non-sensitive fields.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    const users = await User.find({
      organizationId: user.organizationId,
      isActive: true,
    })
      .select("name email role avatarUrl teamId")
      .sort({ name: 1 })
      .lean();

    return apiSuccess(users);
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/users
 * Manager/Admin creates a new team member directly (no email invite flow).
 * The new user gets the same organizationId as the creator.
 * Employee logs in with the credentials the manager sets here.
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!can(currentUser.role, "user:invite")) {
      return apiError("You do not have permission to add team members.", 403);
    }

    const body = await req.json();
    const data = inviteSchema.parse(body);

    // Only super_admin can create another manager
    if (data.role === "manager" && currentUser.role !== "super_admin") {
      return apiError("Only Super Admin can create Manager accounts.", 403);
    }

    const existing = await User.findOne({ email: data.email });
    if (existing) {
      return apiError("An account with this email already exists.", 409);
    }

    const passwordHash = await hashPassword(data.password);

    const newUser = await User.create({
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      organizationId: currentUser.organizationId,
      isActive: true,
      refreshTokenVersion: 0,
    });

    return apiSuccess(
      {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        organizationId: newUser.organizationId,
      },
      201
    );
  } catch (err) {
    return handleApiError(err);
  }
}
