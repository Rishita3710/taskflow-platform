import { ActivityLog, type ActivityAction } from "@/models/ActivityLog";
import mongoose from "mongoose";

export async function logActivity(params: {
  organizationId: mongoose.Types.ObjectId | string;
  taskId: mongoose.Types.ObjectId | string;
  actorId: mongoose.Types.ObjectId | string;
  action: ActivityAction;
  metadata?: Record<string, unknown>;
}) {
  await ActivityLog.create(params);
}
