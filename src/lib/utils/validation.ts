import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  organizationName: z.string().min(2).max(120),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createTaskSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(10000).optional().default(""),
  assigneeIds: z.array(z.string()).min(1, "At least one assignee is required"),
  teamId: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
  visibility: z
    .enum(["public", "team_only", "private", "confidential"])
    .optional()
    .default("team_only"),
  dueDate: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  parentTaskId: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  recurrence: z
    .object({
      frequency: z.enum(["daily", "weekly", "monthly"]),
      interval: z.number().min(1).default(1),
      endDate: z.string().datetime().optional(),
    })
    .optional(),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum([
    "todo",
    "in_progress",
    "need_clarification",
    "under_review",
    "completed",
    "rejected",
    "reopened",
  ]),
  comment: z.string().max(2000).optional(),
});

export const approvalSchema = z.object({
  decision: z.enum(["approved", "rejected", "changes_requested"]),
  note: z.string().max(2000).optional(),
});

export const createCommentSchema = z.object({
  body: z.string().min(1).max(8000),
  parentCommentId: z.string().optional(),
  mentions: z.array(z.string()).optional().default([]),
  isInternal: z.boolean().optional().default(false),
  isClarificationRequest: z.boolean().optional().default(false),
  isDecision: z.boolean().optional().default(false),
  attachments: z
    .array(
      z.object({
        fileName: z.string().min(1).max(255),
        fileUrl: z.string().min(1),
        fileSize: z.number().nonnegative(),
        mimeType: z.string().min(1),
      })
    )
    .optional()
    .default([]),
});
