"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { MessageCircleQuestion, Clock, AlertCircle, CheckCircle2, ListTodo } from "lucide-react";
import { apiFetch } from "@/lib/utils/apiClient";
import { Badge, STATUS_TONE, PRIORITY_TONE, formatLabel } from "@/components/ui/Badge";

interface MyTask {
  _id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  assigneeIds?: { _id: string; name: string }[];
}

interface EmployeeStats {
  total: number;
  pending: number;
  needClarification: number;
  overdue: number;
  completed: number;
  myUpcoming?: MyTask[];
  myUrgent?: MyTask[];
}


function TaskRow({ task }: { task: MyTask }) {
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    !["completed", "rejected"].includes(task.status);

  return (
    <Link
      href={`/tasks/${task._id}`}
      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--color-surface-2)] border-b border-[var(--color-border)] last:border-b-0 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{task.title}</p>
        {task.dueDate && (
          <p className={`text-xs mt-0.5 ${isOverdue ? "text-[var(--color-danger)]" : "text-[var(--color-text-dim)]"}`}>
            {isOverdue ? "Overdue · " : "Due "}
            {new Date(task.dueDate).toLocaleDateString()}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Badge tone={PRIORITY_TONE[task.priority]}>{formatLabel(task.priority)}</Badge>
        <Badge tone={STATUS_TONE[task.status]}>{formatLabel(task.status)}</Badge>
      </div>
    </Link>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex items-center gap-3">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-xl font-semibold">{value}</p>
        <p className="text-xs text-[var(--color-text-dim)]">{label}</p>
      </div>
    </div>
  );
}

export function EmployeeDashboard({
  data,
  firstName,
}: {
  data: EmployeeStats;
  firstName: string;
}) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "urgent" | "clarification">("upcoming");

  // Fetch clarification tasks separately for the dedicated tab
  const { data: clarificationTasks } = useSWR(
    activeTab === "clarification"
      ? "/api/tasks?status=need_clarification&limit=20"
      : null,
    (url) => apiFetch<{ tasks: MyTask[] }>(url).then((d) => d.tasks)
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Hi, {firstName} 👋</h1>
        <p className="text-sm text-[var(--color-text-dim)] mt-1">
          Here is what you are working on today.
        </p>
      </div>

      {/* 4 stat boxes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatBox icon={ListTodo} label="My tasks" value={data.total} color="bg-[var(--color-accent)]" />
        <StatBox icon={Clock} label="Pending" value={data.pending} color="bg-[#2a5cc0]" />
        <StatBox icon={AlertCircle} label="Overdue" value={data.overdue} color="bg-[var(--color-danger)]" />
        <StatBox icon={CheckCircle2} label="Completed" value={data.completed} color="bg-[var(--color-success)]" />
      </div>

      {/* Ask Before Calling banner */}
      <div className="rounded-lg border border-[#1c3a63] bg-[#10243f] p-4 mb-6 flex items-start gap-3">
        <MessageCircleQuestion size={20} className="text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">Have a doubt? Don&apos;t call — chat inside the task.</p>
          <p className="text-xs text-[var(--color-text-dim)] mt-1">
            Open the task below → scroll to Discussion → type your question → check
            &quot;Need clarification&quot;. Your manager gets notified and the answer stays
            attached to the task forever. No more lost WhatsApp messages.
          </p>
        </div>
      </div>

      {/* Task tabs */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-[var(--color-border)]">
          {[
            { key: "upcoming", label: "Coming up" },
            { key: "urgent", label: "High priority" },
            { key: "clarification", label: `Clarifications${data.needClarification > 0 ? ` (${data.needClarification})` : ""}` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex-1 px-4 py-3 text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "text-[var(--color-accent)] border-b-2 border-[var(--color-accent)] -mb-px"
                  : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === "upcoming" && (
            <>
              {data.myUpcoming && data.myUpcoming.length > 0 ? (
                data.myUpcoming.map((t) => <TaskRow key={t._id} task={t} />)
              ) : (
                <p className="px-4 py-8 text-center text-sm text-[var(--color-text-dim)]">
                  No upcoming tasks. You&apos;re all clear!
                </p>
              )}
            </>
          )}

          {activeTab === "urgent" && (
            <>
              {data.myUrgent && data.myUrgent.length > 0 ? (
                data.myUrgent.map((t) => <TaskRow key={t._id} task={t} />)
              ) : (
                <p className="px-4 py-8 text-center text-sm text-[var(--color-text-dim)]">
                  Nothing urgent right now.
                </p>
              )}
            </>
          )}

          {activeTab === "clarification" && (
            <>
              {clarificationTasks && clarificationTasks.length > 0 ? (
                clarificationTasks.map((t) => <TaskRow key={t._id} task={t} />)
              ) : (
                <p className="px-4 py-8 text-center text-sm text-[var(--color-text-dim)]">
                  No open clarification requests.
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer link */}
        <div className="px-4 py-3 border-t border-[var(--color-border)]">
          <Link
            href="/tasks"
            className="text-xs text-[var(--color-accent)] hover:underline"
          >
            View all my tasks →
          </Link>
        </div>
      </div>
    </div>
  );
}
