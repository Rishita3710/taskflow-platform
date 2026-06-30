"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Plus } from "lucide-react";
import { apiFetch } from "@/lib/utils/apiClient";
import { Button } from "@/components/ui/Button";
import { TaskCard } from "@/components/tasks/TaskCard";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { useAuth } from "@/lib/auth/AuthContext";
import { can } from "@/lib/auth/permissions";

interface TaskListResponse {
  tasks: {
    _id: string;
    title: string;
    status: string;
    priority: string;
    visibility: string;
    dueDate?: string;
    assigneeIds?: { _id: string; name: string }[];
  }[];
  pagination: { total: number };
}

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Progress" },
  { value: "need_clarification", label: "Need Clarification" },
  { value: "under_review", label: "Under Review" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
];

export default function TasksPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [showCreate, setShowCreate] = useState(false);

  const query = status ? `?status=${status}` : "";
  const { data, isLoading, mutate } = useSWR(
    `/api/tasks${query}`,
    (url: string) => apiFetch<TaskListResponse>(url)
  );

  const canCreate = user && can(user.role, "task:create");

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Tasks</h1>
          <p className="text-sm text-[var(--color-text-dim)] mt-1">
            {data?.pagination.total ?? 0} tasks visible to you
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New task
          </Button>
        )}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              status === f.value
                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                : "border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--color-text-dim)]">Loading tasks…</p>
      ) : data && data.tasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.tasks.map((task) => (
            <TaskCard key={task._id} task={task} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] p-10 text-center">
          <p className="text-sm text-[var(--color-text-dim)]">
            No tasks here yet. {canCreate ? "Create one to get started." : "Check back soon."}
          </p>
        </div>
      )}

      <CreateTaskModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => mutate()}
      />
    </div>
  );
}
