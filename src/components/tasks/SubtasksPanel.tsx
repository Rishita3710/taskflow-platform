"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus } from "lucide-react";
import { apiFetch } from "@/lib/utils/apiClient";
import { TaskQueueRow, EmptyQueue } from "@/components/tasks/TaskQueueRow";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { Button } from "@/components/ui/Button";

interface SubtaskData {
  _id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  assigneeIds?: { _id: string; name: string }[];
}

const fetcher = (url: string) => apiFetch<SubtaskData[]>(url);

export function SubtasksPanel({ taskId, canCreate }: { taskId: string; canCreate: boolean }) {
  const { data, mutate } = useSWR(`/api/tasks/${taskId}/subtasks`, fetcher);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <h2 className="text-sm font-semibold">Subtasks {data && data.length > 0 && `(${data.length})`}</h2>
        {canCreate && (
          <Button variant="ghost" onClick={() => setShowCreate(true)} className="!px-2 !py-1">
            <Plus size={14} /> Add
          </Button>
        )}
      </div>
      <div>
        {data && data.length > 0 ? (
          data.map((t) => <TaskQueueRow key={t._id} task={t} />)
        ) : (
          <EmptyQueue message="No subtasks yet." />
        )}
      </div>

      <CreateTaskModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => mutate()}
        defaultParentTaskId={taskId}
      />
    </div>
  );
}
