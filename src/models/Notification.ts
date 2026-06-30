import mongoose, { Schema, Document, Model } from "mongoose";

export type NotificationType =
  | "task_assigned"
  | "comment_added"
  | "mentioned"
  | "deadline_approaching"
  | "overdue"
  | "task_approved"
  | "task_rejected"
  | "status_changed"
  | "clarification_requested"
  | "clarification_resolved"
  | "escalation";

export interface INotification extends Document {
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // recipient
  type: NotificationType;
  taskId?: mongoose.Types.ObjectId;
  commentId?: mongoose.Types.ObjectId;
  triggeredBy?: mongoose.Types.ObjectId;
  message: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: [
        "task_assigned",
        "comment_added",
        "mentioned",
        "deadline_approaching",
        "overdue",
        "task_approved",
        "task_rejected",
        "status_changed",
        "clarification_requested",
        "clarification_resolved",
        "escalation",
      ],
      required: true,
    },
    taskId: { type: Schema.Types.ObjectId, ref: "Task" },
    commentId: { type: Schema.Types.ObjectId, ref: "Comment" },
    triggeredBy: { type: Schema.Types.ObjectId, ref: "User" },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
