import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { hashPassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { registerSchema } from "@/lib/utils/validation";
import { apiSuccess, handleApiError, apiError } from "@/lib/utils/apiResponse";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/session";

/**
 * POST /api/auth/register
 *
 * Registers a brand-new organization (tenant) along with its first
 * user, who automatically becomes "super_admin". Subsequent users
 * are invited by an admin/manager via /api/users (not implemented
 * in this skeleton, but the model + RBAC already support it).
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const data = registerSchema.parse(body);

    const existing = await User.findOne({ email: data.email });
    if (existing) {
      return apiError("An account with this email already exists.", 409);
    }

    const slug = data.organizationName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const org = await Organization.create({
      name: data.organizationName,
      slug: `${slug}-${Date.now().toString(36)}`, // ensure uniqueness
      plan: "free",
    });

    const passwordHash = await hashPassword(data.password);

    const user = await User.create({
      name: data.name,
      email: data.email,
      passwordHash,
      role: "super_admin",
      organizationId: org._id,
    });

    org.ownerId = user._id;
    await org.save();

    const accessToken = signAccessToken({
      userId: user.id.toString(),
      organizationId: org.id.toString(),
      role: user.role,
    });
    const refreshToken = signRefreshToken({
      userId: user.id.toString(),
      tokenVersion: user.refreshTokenVersion,
    });

    const response = apiSuccess(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: org.id,
        },
        organization: { id: org.id, name: org.name, slug: org.slug },
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
