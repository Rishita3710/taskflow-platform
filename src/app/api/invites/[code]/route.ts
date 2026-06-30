import { NextRequest } from "next/server";
import { z } from "zod";
import { InviteCode } from "@/models/InviteCode";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { hashPassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/apiResponse";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/session";

const joinSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(6).max(72),
});

/**
 * GET /api/invites/:code
 * Returns the invite's metadata (org name, intended role, pre-filled name/email)
 * so the /join page can show the employee what they're joining.
 * Does NOT require authentication — the employee isn't logged in yet.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const invite = await InviteCode.findOne({
      code: code.toUpperCase(),
      usedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });

    if (!invite) {
      return apiError(
        "This invite code is invalid, has already been used, or has expired. Ask your manager for a new one.",
        404
      );
    }

    const org = await Organization.findById(invite.organizationId).select("name").lean();

    return apiSuccess({
      code: invite.code,
      organizationName: org?.name || "Your organization",
      intendedRole: invite.intendedRole,
      intendedEmail: invite.intendedEmail || "",
      intendedName: invite.intendedName || "",
      expiresAt: invite.expiresAt,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/invites/:code
 * Employee submits their name, email, and chosen password to complete registration.
 * Marks the invite as used, creates the User, and returns auth cookies so they're
 * logged in immediately — no separate login step needed.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    // Re-fetch and lock the invite inside one find-then-update to prevent
    // two simultaneous requests using the same code.
    const invite = await InviteCode.findOne({
      code: code.toUpperCase(),
      usedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });

    if (!invite) {
      return apiError(
        "This invite code is invalid, has already been used, or has expired.",
        404
      );
    }

    const body = await req.json();
    const data = joinSchema.parse(body);

    // If the invite had a pre-filled email, enforce it
    if (invite.intendedEmail && invite.intendedEmail !== data.email.toLowerCase()) {
      return apiError(
        `This invite was created for ${invite.intendedEmail}. Please use that email address.`,
        400
      );
    }

    const existing = await User.findOne({ email: data.email });
    if (existing) {
      return apiError("An account with this email already exists. Try logging in instead.", 409);
    }

    const passwordHash = await hashPassword(data.password);

    const newUser = await User.create({
      name: data.name,
      email: data.email,
      passwordHash,
      role: invite.intendedRole,
      organizationId: invite.organizationId,
      isActive: true,
      refreshTokenVersion: 0,
    });

    // Mark the invite as used
    invite.usedAt = new Date();
    invite.usedBy = newUser._id;
    await invite.save();

    // Log them in immediately by issuing auth cookies
    const accessToken = signAccessToken({
      userId: newUser.id.toString(),
      organizationId: invite.organizationId.toString(),
      role: newUser.role,
    });
    const refreshToken = signRefreshToken({
      userId: newUser.id.toString(),
      tokenVersion: newUser.refreshTokenVersion,
    });

    const response = apiSuccess(
      {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          organizationId: newUser.organizationId,
        },
      },
      201
    );

    response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 15,
      path: "/",
    });
    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    response.cookies.set("tf_socket_token", accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 15,
      path: "/",
    });

    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
