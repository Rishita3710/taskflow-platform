import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Roles drive the entire RBAC system. Stored as a simple string enum
 * rather than a separate collection because permission logic is static
 * and defined in code (see src/lib/auth/permissions.ts), not configurable
 * per-tenant in the MVP.
 */
export type UserRole = "super_admin" | "manager" | "team_lead" | "employee";

export interface IUser extends Document {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  organizationId: mongoose.Types.ObjectId;
  teamId?: mongoose.Types.ObjectId;
  avatarUrl?: string;
  isActive: boolean;
  refreshTokenVersion: number; // bump to invalidate all existing refresh tokens
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["super_admin", "manager", "team_lead", "employee"],
      default: "employee",
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    teamId: { type: Schema.Types.ObjectId, ref: "Team" },
    avatarUrl: { type: String },
    isActive: { type: Boolean, default: true },
    refreshTokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

UserSchema.index({ organizationId: 1, role: 1 });

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
