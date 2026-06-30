import { apiSuccess } from "@/lib/utils/apiResponse";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/session";

export async function POST() {
  const response = apiSuccess({ message: "Logged out" });
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", { maxAge: 0, path: "/" });
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", { maxAge: 0, path: "/" });
  response.cookies.set("tf_socket_token", "", { maxAge: 0, path: "/" });
  return response;
}
