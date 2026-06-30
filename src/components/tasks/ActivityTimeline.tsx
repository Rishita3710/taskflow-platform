"use client";

import useSWR from "swr";
import { apiFetch } from "@/lib/utils/apiClient";
import { formatLabel } from "@/components/ui/Badge";

interface ActivityEntry {
  _id: string;
  action: string;
  actorId: { name: string };
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const fetcher = (url: string) => apiFetch<ActivityEntry[]>(url);

function describeActivity(entry: ActivityEntry): string {
  const actor = entry.actorId?.name || "Someone";
  switch (entry.action) {
    case "task_created":
      return `${actor} created this task`;
    case "status_changed":
      return `${actor} changed status from ${formatLabel(String(entry.metadata?.from))} to ${formatLabel(String(entry.metadata?.to))}`;
    case "comment_posted":
      return `${actor} posted a comment`;
    case "approved":
      return `${actor} approved the task`;
    case "rejected":
      return `${actor} rejected the task`;
    case "changes_requested":
      return `${actor} requested changes`;
    case "task_updated":
      return `${actor} updated task details`;
    default:
      return `${actor} performed ${formatLabel(entry.action)}`;
  }
}

export function ActivityTimeline({ taskId }: { taskId: string }) {
  const { data } = useSWR(`/api/tasks/${taskId}/activity`, fetcher);

  if (!data || data.length === 0) {
    return <p className="text-xs text-[var(--color-text-dim)]">No activity yet.</p>;
  }

  return (
    <ol className="space-y-3">
      {data.map((entry) => (
        <li key={entry._id} className="flex gap-3 text-xs">
          <div className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] flex-shrink-0" />
          <div>
            <p className="text-[var(--color-text)]">{describeActivity(entry)}</p>
            <p className="text-[var(--color-text-dim)] mt-0.5">
              {new Date(entry.createdAt).toLocaleString()}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
