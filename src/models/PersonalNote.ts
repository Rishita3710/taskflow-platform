import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * A private note a user writes for themselves on a specific task.
 * Never visible to anyone else, including managers — this is
 * explicitly a personal scratchpad, not part of the shared discussion
 * thread or audit trail. One note document per (user, task) pair.
 */
export interface IPersonalNote extends Document {
  userId: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  body: string;
  updatedAt: Date;
  createdAt: Date;
}

const PersonalNoteSchema = new Schema<IPersonalNote>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    body: { type: String, default: "", maxlength: 5000 },
  },
  { timestamps: true }
);

PersonalNoteSchema.index({ userId: 1, taskId: 1 }, { unique: true });

export const PersonalNote: Model<IPersonalNote> =
  mongoose.models.PersonalNote ||
  mongoose.model<IPersonalNote>("PersonalNote", PersonalNoteSchema);
