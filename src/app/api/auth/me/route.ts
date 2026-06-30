import { getCurrentUser } from "@/lib/auth/session";
import { apiSuccess, handleApiError } from "@/lib/utils/apiResponse";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return apiSuccess({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      teamId: user.teamId,
      avatarUrl: user.avatarUrl,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
