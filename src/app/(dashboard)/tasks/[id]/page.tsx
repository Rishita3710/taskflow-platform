"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { apiFetch, ApiClientError } from "@/lib/utils/apiClient";
import { Badge, STATUS_TONE, PRIORITY_TONE, formatLabel } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DiscussionThread } from "@/components/tasks/DiscussionThread";
import { ActivityTimeline } from "@/components/tasks/ActivityTimeline";
import { SubtasksPanel } from "@/components/tasks/SubtasksPanel";
import { TaskAttachmentsPanel } from "@/components/tasks/TaskAttachmentsPanel";
import { PersonalNotesPanel } from "@/components/tasks/PersonalNotesPanel";
import { useAuth } from "@/lib/auth/AuthContext";
import { can } from "@/lib/auth/permissions";

interface TaskDetail {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  visibility: string;
  dueDate?: string;
  managerNotes?: string;
  assigneeIds: { _id: string; name: string; email: string }[];
  createdBy: { _id: string; name: string };
  parentTaskId?: string;
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  todo: ["in_progress", "need_clarification"],
  in_progress: ["need_clarification", "under_review", "todo"],
  need_clarification: ["in_progress", "todo"],
  under_review: ["in_progress"],
  rejected: ["reopened", "in_progress"],
  completed: ["reopened"],
  reopened: ["in_progress", "todo"],
};

const fetcher = (url: string) => apiFetch<TaskDetail>(url);

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params.id as string;
  const { user } = useAuth();
  const { data: task, mutate, error } = useSWR(taskId ? `/api/tasks/${taskId}` : null, fetcher);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  async function changeStatus(status: string) {
    setActionError("");
    setActionLoading(true);
    try {
      await apiFetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      mutate();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  }

  async function approve(decision: "approved" | "rejected" | "changes_requested") {
    setActionError("");
    setActionLoading(true);
    try {
      await apiFetch(`/api/tasks/${taskId}/approve`, {
        method: "PATCH",
        body: JSON.stringify({ decision }),
      });
      mutate();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : "Failed to record decision");
    } finally {
      setActionLoading(false);
    }
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-sm text-[var(--color-danger)]">
          {error instanceof ApiClientError ? error.message : "Could not load task."}
        </p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-8">
        <p className="text-sm text-[var(--color-text-dim)]">Loading task…</p>
      </div>
    );
  }

  const canApprove = user && can(user.role, "task:approve") && task.status === "under_review";
  const canCreateSubtask = user && can(user.role, "task:create");
  const availableTransitions = STATUS_TRANSITIONS[task.status] || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] h-full">
      {/* Left: task details + discussion thread */}
      <div className="p-8 overflow-y-auto scrollbar-thin border-r border-[var(--color-border)]">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge tone={STATUS_TONE[task.status]}>{formatLabel(task.status)}</Badge>
            <Badge tone={PRIORITY_TONE[task.priority]}>{formatLabel(task.priority)} priority</Badge>
            <Badge tone="default">{formatLabel(task.visibility)}</Badge>
            {task.parentTaskId && <Badge tone="default">Subtask</Badge>}
          </div>
          <h1 className="text-xl font-semibold">{task.title}</h1>
          <p className="text-sm text-[var(--color-text-dim)] mt-2 whitespace-pre-wrap">
            {task.description || "No description provided."}
          </p>
          <p className="text-xs text-[var(--color-text-dim)] mt-3">
            Created by {task.createdBy?.name} · Assigned to{" "}
            {task.assigneeIds?.map((a) => a.name).join(", ") || "no one"}
            {task.dueDate && ` · Due ${new Date(task.dueDate).toLocaleDateString()}`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-6">
          {availableTransitions.map((next) => (
            <Button key={next} variant="secondary" disabled={actionLoading} onClick={() => changeStatus(next)}>
              Move to {formatLabel(next)}
            </Button>
          ))}
          {canApprove && (
            <>
              <Button disabled={actionLoading} onClick={() => approve("approved")}>
                Approve
              </Button>
              <Button variant="secondary" disabled={actionLoading} onClick={() => approve("changes_requested")}>
                Request changes
              </Button>
              <Button variant="danger" disabled={actionLoading} onClick={() => approve("rejected")}>
                Reject
              </Button>
            </>
          )}
        </div>

        {actionError && <p className="text-sm text-[var(--color-danger)] mb-4">{actionError}</p>}

        {task.managerNotes && (
          <div className="mb-6 rounded-lg border border-[#3f2657] bg-[#1a1424] p-4">
            <p className="text-xs font-medium text-[var(--color-clarify)] mb-1">Manager-only notes</p>
            <p className="text-sm whitespace-pre-wrap">{task.managerNotes}</p>
          </div>
        )}

        <div className="mb-6">
          <TaskAttachmentsPanel taskId={taskId} />
        </div>

        {!task.parentTaskId && (
          <div className="mb-6">
            <SubtasksPanel taskId={taskId} canCreate={Boolean(canCreateSubtask)} />
          </div>
        )}

        <div className="mb-6">
          <PersonalNotesPanel taskId={taskId} />
        </div>

        <div className="h-[480px]">
          <h2 className="text-sm font-semibold mb-3">Discussion</h2>
          <DiscussionThread taskId={taskId} />
        </div>
      </div>

      {/* Right: activity timeline */}
      <div className="p-6 overflow-y-auto scrollbar-thin">
        <h2 className="text-sm font-semibold mb-4">Activity timeline</h2>
        <ActivityTimeline taskId={taskId} />
      </div>
    </div>
  );
}
