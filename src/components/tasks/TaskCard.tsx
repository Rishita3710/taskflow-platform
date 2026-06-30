import Link from "next/link";
import { Badge, STATUS_TONE, PRIORITY_TONE, formatLabel } from "@/components/ui/Badge";

interface TaskCardData {
  _id: string;
  title: string;
  status: string;
  priority: string;
  visibility: string;
  dueDate?: string;
  assigneeIds?: { _id: string; name: string }[];
}

export function TaskCard({ task }: { task: TaskCardData }) {
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    !["completed", "rejected"].includes(task.status);

  return (
    <Link
      href={`/tasks/${task._id}`}
      className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-accent)] transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium leading-snug">{task.title}</h3>
        <Badge tone={PRIORITY_TONE[task.priority]}>{formatLabel(task.priority)}</Badge>
      </div>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <Badge tone={STATUS_TONE[task.status]}>{formatLabel(task.status)}</Badge>
        {isOverdue && <Badge tone="danger">Overdue</Badge>}
        {task.visibility !== "team_only" && (
          <Badge tone="default">{formatLabel(task.visibility)}</Badge>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-text-dim)]">
        <span>
          {task.assigneeIds && task.assigneeIds.length > 0
            ? task.assigneeIds.map((a) => a.name).join(", ")
            : "Unassigned"}
        </span>
        {task.dueDate && <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>}
      </div>
    </Link>
  );
}
