import Link from "next/link";
import { Badge, STATUS_TONE, PRIORITY_TONE, formatLabel } from "@/components/ui/Badge";

interface QueueTask {
  _id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  assigneeIds?: { _id: string; name: string }[];
}

export function TaskQueueRow({ task }: { task: QueueTask }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <Link
      href={`/tasks/${task._id}`}
      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--color-surface-2)] transition-colors border-b border-[var(--color-border)] last:border-b-0"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{task.title}</p>
        {task.assigneeIds && task.assigneeIds.length > 0 && (
          <p className="text-xs text-[var(--color-text-dim)] mt-0.5">
            {task.assigneeIds.map((a) => a.name).join(", ")}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Badge tone={PRIORITY_TONE[task.priority]}>{formatLabel(task.priority)}</Badge>
        <Badge tone={STATUS_TONE[task.status]}>{formatLabel(task.status)}</Badge>
        {isOverdue && <Badge tone="danger">Overdue</Badge>}
      </div>
    </Link>
  );
}

export function EmptyQueue({ message }: { message: string }) {
  return (
    <p className="px-4 py-6 text-center text-sm text-[var(--color-text-dim)]">{message}</p>
  );
}
