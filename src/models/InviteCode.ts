import mongoose, { Schema, Document, Model } from "mongoose";
import type { UserRole } from "./User";

/**
 * An InviteCode is created by a Manager/Admin for a future employee.
 * The employee uses the code at /join to self-register and set their
 * own password. The code is single-use and expires after 7 days.
 */
export interface IInviteCode extends Document {
  code: string;               // e.g. "TF-A3X9K2" — shared with the employee
  organizationId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  intendedRole: UserRole;
  intendedEmail?: string;     // optional — manager can pre-fill the email
  intendedName?: string;      // optional — manager can pre-fill the name
  usedAt?: Date;
  usedBy?: mongoose.Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

const InviteCodeSchema = new Schema<IInviteCode>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    intendedRole: {
      type: String,
      enum: ["manager", "team_lead", "employee"],
      default: "employee",
    },
    intendedEmail: { type: String, lowercase: true, trim: true },
    intendedName: { type: String, trim: true },
    usedAt: { type: Date },
    usedBy: { type: Schema.Types.ObjectId, ref: "User" },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Auto-delete expired codes from the DB after 30 days
InviteCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export const InviteCode: Model<IInviteCode> =
  mongoose.models.InviteCode ||
  mongoose.model<IInviteCode>("InviteCode", InviteCodeSchema);
