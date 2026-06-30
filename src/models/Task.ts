import mongoose, { Schema, Document, Model } from "mongoose";

export type TaskStatus =
  | "todo"
  | "in_progress"
  | "need_clarification"
  | "under_review"
  | "completed"
  | "rejected"
  | "reopened";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskVisibility = "public" | "team_only" | "private" | "confidential";

export interface IAttachment {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
  isPrivate: boolean; // private attachments visible only to managers/uploader
}

export interface IRecurrence {
  frequency: "daily" | "weekly" | "monthly";
  interval: number; // every N days/weeks/months
  endDate?: Date;
  nextRunAt?: Date;
}

export interface ITask extends Document {
  id: string;
  title: string;
  description: string;
  organizationId: mongoose.Types.ObjectId;
  teamId?: mongoose.Types.ObjectId;

  createdBy: mongoose.Types.ObjectId;
  assigneeIds: mongoose.Types.ObjectId[];
  watcherIds: mongoose.Types.ObjectId[];

  parentTaskId?: mongoose.Types.ObjectId; // for subtasks
  isSubtask: boolean;

  status: TaskStatus;
  priority: TaskPriority;
  visibility: TaskVisibility;

  dueDate?: Date;
  startDate?: Date;
  completedAt?: Date;

  attachments: IAttachment[];
  managerNotes?: string; // visible to manager/team_lead/super_admin only, never to employee

  recurrence?: IRecurrence;
  isRecurringTemplate: boolean;

  tags: string[];

  // approval workflow
  approvalStatus?: "pending" | "approved" | "rejected" | "changes_requested";
  approvedBy?: mongoose.Types.ObjectId;
  approvalNote?: string;

  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>(
  {
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    uploadedAt: { type: Date, default: Date.now },
    isPrivate: { type: Boolean, default: false },
  },
  { _id: true }
);

const RecurrenceSchema = new Schema<IRecurrence>(
  {
    frequency: { type: String, enum: ["daily", "weekly", "monthly"] },
    interval: { type: Number, default: 1 },
    endDate: { type: Date },
    nextRunAt: { type: Date },
  },
  { _id: false }
);

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 10000 },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", index: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assigneeIds: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
    watcherIds: [{ type: Schema.Types.ObjectId, ref: "User" }],

    parentTaskId: { type: Schema.Types.ObjectId, ref: "Task", index: true },
    isSubtask: { type: Boolean, default: false },

    status: {
      type: String,
      enum: [
        "todo",
        "in_progress",
        "need_clarification",
        "under_review",
        "completed",
        "rejected",
        "reopened",
      ],
      default: "todo",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    visibility: {
      type: String,
      enum: ["public", "team_only", "private", "confidential"],
      default: "team_only",
      index: true,
    },

    dueDate: { type: Date, index: true },
    startDate: { type: Date },
    completedAt: { type: Date },

    attachments: [AttachmentSchema],
    managerNotes: { type: String, maxlength: 5000 },

    recurrence: RecurrenceSchema,
    isRecurringTemplate: { type: Boolean, default: false },

    tags: [{ type: String, trim: true, lowercase: true }],

    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "changes_requested"],
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvalNote: { type: String, maxlength: 2000 },
  },
  { timestamps: true }
);

// Compound indexes for common dashboard queries
TaskSchema.index({ organizationId: 1, status: 1, dueDate: 1 });
TaskSchema.index({ organizationId: 1, assigneeIds: 1, status: 1 });
TaskSchema.index({ title: "text", description: "text" }); // basic full-text search

export const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);
