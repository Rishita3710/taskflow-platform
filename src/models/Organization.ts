import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Every tenant (company) using TaskFlow is an Organization.
 * All other collections (User, Task, Team, etc.) carry an
 * organizationId so a single shared database can serve many
 * tenants while keeping their data fully isolated in queries.
 */
export interface IOrganization extends Document {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "pro" | "enterprise";
  ownerId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    plan: { type: String, enum: ["free", "pro", "enterprise"], default: "free" },
    ownerId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Organization: Model<IOrganization> =
  mongoose.models.Organization ||
  mongoose.model<IOrganization>("Organization", OrganizationSchema);
