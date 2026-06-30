import { NextRequest } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { InviteCode } from "@/models/InviteCode";
import { getCurrentUser } from "@/lib/auth/session";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/apiResponse";
import { can } from "@/lib/auth/permissions";

const createInviteSchema = z.object({
  intendedRole: z.enum(["team_lead", "employee"]).default("employee"),
  intendedEmail: z.string().email().optional(),
  intendedName: z.string().min(1).max(120).optional(),
});

/**
 * POST /api/invites
 * Manager/Admin generates a new join code to share with an employee.
 * Returns the code + a ready-to-share join URL.
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!can(currentUser.role, "user:invite")) {
      return apiError("You do not have permission to create invite codes.", 403);
    }

    const body = await req.json();
    const data = createInviteSchema.parse(body);

    // Generate a human-friendly code: TF-XXXXXX (uppercase, no ambiguous chars)
    const randomPart = nanoid(6).toUpperCase().replace(/[0OIl]/g, "X");
    const code = `TF-${randomPart}`;

    // Expires in 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await InviteCode.create({
      code,
      organizationId: currentUser.organizationId,
      createdBy: currentUser._id,
      intendedRole: data.intendedRole,
      intendedEmail: data.intendedEmail,
      intendedName: data.intendedName,
      expiresAt,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const joinUrl = `${appUrl}/join?code=${code}`;

    return apiSuccess(
      {
        code: invite.code,
        joinUrl,
        intendedRole: invite.intendedRole,
        intendedEmail: invite.intendedEmail,
        intendedName: invite.intendedName,
        expiresAt: invite.expiresAt,
      },
      201
    );
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * GET /api/invites
 * Lists all unused invite codes for this organization (manager view).
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!can(currentUser.role, "user:invite")) {
      return apiError("You do not have permission to view invite codes.", 403);
    }

    const invites = await InviteCode.find({
      organizationId: currentUser.organizationId,
      usedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    })
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    return apiSuccess(invites);
  } catch (err) {
    return handleApiError(err);
  }
}
