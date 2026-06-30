import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Comment = one message inside a task's discussion thread.
 * This collection is the core USP: every clarification, decision,
 * and approval discussion lives here, permanently attached to a task.
 */
export interface ICommentAttachment {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export interface IComment extends Document {
  taskId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;

  body: string;
  parentCommentId?: mongoose.Types.ObjectId; // threaded replies

  mentions: mongoose.Types.ObjectId[]; // @mentioned user IDs

  attachments: ICommentAttachment[];

  // visibility for "manager-only / internal discussion hidden from employees"
  isInternal: boolean;

  // "Need Help" / "Ask Before Calling" workflow marks a comment as a flagged question
  isClarificationRequest: boolean;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;

  // marks this comment as a recorded decision for the knowledge base / decision log
  isDecision: boolean;

  readBy: { userId: mongoose.Types.ObjectId; readAt: Date }[]; // read receipts

  editedAt?: Date;
  deletedAt?: Date; // soft delete to preserve thread integrity

  createdAt: Date;
  updatedAt: Date;
}

const CommentAttachmentSchema = new Schema<ICommentAttachment>(
  {
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
  },
  { _id: false }
);

const CommentSchema = new Schema<IComment>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    body: { type: String, required: true, maxlength: 8000 },
    parentCommentId: { type: Schema.Types.ObjectId, ref: "Comment", index: true },

    mentions: [{ type: Schema.Types.ObjectId, ref: "User" }],

    attachments: [CommentAttachmentSchema],

    isInternal: { type: Boolean, default: false, index: true },

    isClarificationRequest: { type: Boolean, default: false },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },

    isDecision: { type: Boolean, default: false, index: true },

    readBy: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date, default: Date.now },
      },
    ],

    editedAt: { type: Date },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

CommentSchema.index({ taskId: 1, createdAt: 1 });
CommentSchema.index({ body: "text" }); // searchable discussion history

export const Comment: Model<IComment> =
  mongoose.models.Comment || mongoose.model<IComment>("Comment", CommentSchema);
