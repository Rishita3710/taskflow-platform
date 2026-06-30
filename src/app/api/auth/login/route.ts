import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { User } from "@/models/User";
import { comparePassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { loginSchema } from "@/lib/utils/validation";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/apiResponse";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const data = loginSchema.parse(body);

    const user = await User.findOne({ email: data.email });
    if (!user || !user.isActive) {
      return apiError("Invalid email or password.", 401);
    }

    const valid = await comparePassword(data.password, user.passwordHash);
    if (!valid) {
      return apiError("Invalid email or password.", 401);
    }

    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = signAccessToken({
      userId: user.id.toString(),
      organizationId: user.organizationId.toString(),
      role: user.role,
    });
    const refreshToken = signRefreshToken({
      userId: user.id.toString(),
      tokenVersion: user.refreshTokenVersion,
    });

    const response = apiSuccess({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        teamId: user.teamId,
      },
    });

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
    // Non-httpOnly so the browser's Socket.io client can read it and
    // pass it in the handshake `auth` payload. Short-lived, same value
    // as the access token, used ONLY for socket auth (not real CSRF risk
    // since it's read by JS we control, never sent automatically like a cookie header would be).
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
