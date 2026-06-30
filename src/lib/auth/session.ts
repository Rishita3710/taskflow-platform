import { cookies } from "next/headers";
import { verifyAccessToken } from "./jwt";
import { connectDB } from "@/lib/db/connect";
import { User, type IUser } from "@/models/User";

export const ACCESS_TOKEN_COOKIE = "tf_access_token";
export const REFRESH_TOKEN_COOKIE = "tf_refresh_token";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/**
 * Reads the access token cookie, verifies it, and loads the
 * corresponding user from the DB. Throws AuthError (401) if
 * the token is missing/invalid/expired, or the user is deactivated.
 *
 * Use this at the top of every protected API route:
 *   const user = await getCurrentUser();
 */
export async function getCurrentUser(): Promise<IUser> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    throw new AuthError("Not authenticated. Please log in.");
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AuthError("Session expired. Please log in again.");
  }

  await connectDB();
  const user = await User.findById(payload.userId);

  if (!user || !user.isActive) {
    throw new AuthError("Account not found or deactivated.", 403);
  }

  return user;
}

/**
 * Like getCurrentUser, but returns null instead of throwing.
 * Useful for routes that behave differently for logged-out users.
 */
export async function getCurrentUserOrNull(): Promise<IUser | null> {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}
