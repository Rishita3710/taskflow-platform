import { Notification, type NotificationType } from "@/models/Notification";
import mongoose from "mongoose";

export async function notifyUsers(params: {
  organizationId: mongoose.Types.ObjectId | string;
  userIds: (mongoose.Types.ObjectId | string)[];
  type: NotificationType;
  message: string;
  taskId?: mongoose.Types.ObjectId | string;
  commentId?: mongoose.Types.ObjectId | string;
  triggeredBy?: mongoose.Types.ObjectId | string;
}) {
  const { organizationId, userIds, type, message, taskId, commentId, triggeredBy } = params;

  // dedupe and never notify the user who triggered the event about their own action
  const uniqueRecipients = Array.from(
    new Set(userIds.map((id) => id.toString()))
  ).filter((id) => id !== triggeredBy?.toString());

  if (uniqueRecipients.length === 0) return [];

  const docs = uniqueRecipients.map((userId) => ({
    organizationId,
    userId,
    type,
    message,
    taskId,
    commentId,
    triggeredBy,
  }));

  return Notification.insertMany(docs);
}
