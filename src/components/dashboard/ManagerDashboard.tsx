"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { TaskQueueRow, EmptyQueue } from "@/components/tasks/TaskQueueRow";
import { Button } from "@/components/ui/Button";

interface QueueTask {
  _id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  assigneeIds?: { _id: string; name: string }[];
}

interface ManagerStats {
  total: number;
  pending: number;
  needClarification: number;
  overdue: number;
  completed: number;
  needsApproval?: QueueTask[];
  needsClarificationList?: QueueTask[];
  recentlyOverdue?: QueueTask[];
  teamPerformance?: {
    userId: string;
    name: string;
    totalAssigned: number;
    completedCount: number;
    overdueCount: number;
    completionRate: number;
  }[];
}

export function ManagerDashboard({
  data,
  firstName,
  onCreateTask,
}: {
  data: ManagerStats;
  firstName: string;
  onCreateTask: () => void;
}) {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Manager Dashboard</h1>
          <p className="text-sm text-[var(--color-text-dim)] mt-1">
            Welcome back, {firstName}. Here&#x2019;s what needs your attention.
          </p>
        </div>
        <Button onClick={onCreateTask}>
          <Plus size={16} /> Assign new task
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard label="Total tasks" value={data.total} />
        <StatCard label="Pending" value={data.pending} />
        <StatCard label="Need clarification" value={data.needClarification} tone="clarify" />
        <StatCard label="Overdue" value={data.overdue} tone="danger" />
        <StatCard label="Completed" value={data.completed} tone="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <h2 className="text-sm font-semibold">Awaiting your approval</h2>
            {data.needsApproval && data.needsApproval.length > 0 && (
              <span className="text-xs text-[var(--color-warning)] font-medium">
                {data.needsApproval.length} pending
              </span>
            )}
          </div>
          <div>
            {data.needsApproval && data.needsApproval.length > 0 ? (
              data.needsApproval.map((t) => <TaskQueueRow key={t._id} task={t} />)
            ) : (
              <EmptyQueue message="Nothing waiting on you right now." />
            )}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <h2 className="text-sm font-semibold">Employees need clarification</h2>
            {data.needsClarificationList && data.needsClarificationList.length > 0 && (
              <span className="text-xs text-[var(--color-clarify)] font-medium">
                {data.needsClarificationList.length} waiting
              </span>
            )}
          </div>
          <div>
            {data.needsClarificationList && data.needsClarificationList.length > 0 ? (
              data.needsClarificationList.map((t) => <TaskQueueRow key={t._id} task={t} />)
            ) : (
              <EmptyQueue message="No one is blocked waiting on you." />
            )}
          </div>
        </div>
      </div>

      {data.recentlyOverdue && data.recentlyOverdue.length > 0 && (
        <div className="rounded-lg border border-[#5a1f1f] bg-[#1f1414] overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-[#5a1f1f]">
            <h2 className="text-sm font-semibold text-[var(--color-danger)]">Overdue across the team</h2>
          </div>
          <div>
            {data.recentlyOverdue.map((t) => (
              <TaskQueueRow key={t._id} task={t} />
            ))}
          </div>
        </div>
      )}

      {data.teamPerformance && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <h2 className="text-sm font-semibold">Team performance</h2>
            <Link href="/team" className="text-xs text-[var(--color-accent)] hover:underline">
              View full team
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--color-text-dim)] text-xs">
                <th className="px-5 py-2 font-medium">Employee</th>
                <th className="px-5 py-2 font-medium">Assigned</th>
                <th className="px-5 py-2 font-medium">Completed</th>
                <th className="px-5 py-2 font-medium">Overdue</th>
                <th className="px-5 py-2 font-medium">Completion rate</th>
              </tr>
            </thead>
            <tbody>
              {data.teamPerformance.map((row) => (
                <tr key={row.userId} className="border-t border-[var(--color-border)]">
                  <td className="px-5 py-3">{row.name}</td>
                  <td className="px-5 py-3">{row.totalAssigned}</td>
                  <td className="px-5 py-3 text-[var(--color-success)]">{row.completedCount}</td>
                  <td className="px-5 py-3 text-[var(--color-danger)]">{row.overdueCount}</td>
                  <td className="px-5 py-3">{row.completionRate.toFixed(0)}%</td>
                </tr>
              ))}
              {data.teamPerformance.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-[var(--color-text-dim)]">
                    No tasks assigned yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
