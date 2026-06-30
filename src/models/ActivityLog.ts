import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Append-only audit trail. Powers both the "Activity Timeline" feature
 * on each task and the Super Admin / Manager "Audit Logs" feature.
 * Never updated or deleted once written.
 */
export type ActivityAction =
  | "task_created"
  | "task_updated"
  | "status_changed"
  | "assignee_added"
  | "assignee_removed"
  | "comment_posted"
  | "comment_edited"
  | "comment_deleted"
  | "attachment_added"
  | "attachment_removed"
  | "approved"
  | "rejected"
  | "changes_requested"
  | "visibility_changed"
  | "priority_changed"
  | "due_date_changed"
  | "watcher_added"
  | "watcher_removed";

export interface IActivityLog extends Document {
  organizationId: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
  action: ActivityAction;
  metadata?: Record<string, unknown>; // e.g. { from: 'todo', to: 'in_progress' }
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ActivityLogSchema.index({ taskId: 1, createdAt: 1 });

export const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);
