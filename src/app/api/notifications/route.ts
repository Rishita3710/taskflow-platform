import { NextRequest } from "next/server";
import { Notification } from "@/models/Notification";
import { getCurrentUser } from "@/lib/auth/session";
import { apiSuccess, handleApiError } from "@/lib/utils/apiResponse";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";

    const filter: Record<string, unknown> = { userId: user._id };
    if (unreadOnly) filter.isRead = false;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("triggeredBy", "name")
      .lean();

    return apiSuccess(notifications);
  } catch (err) {
    return handleApiError(err);
  }
}
