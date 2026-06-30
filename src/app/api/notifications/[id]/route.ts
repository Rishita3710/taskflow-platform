import { Notification } from "@/models/Notification";
import { getCurrentUser } from "@/lib/auth/session";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/apiResponse";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: user._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) return apiError("Notification not found", 404);

    return apiSuccess(notification);
  } catch (err) {
    return handleApiError(err);
  }
}
