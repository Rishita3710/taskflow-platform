"use client";

import { useState } from "react";
import useSWR from "swr";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiFetch } from "@/lib/utils/apiClient";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";
import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";

interface DashboardStats {
  scope: "personal" | "team";
  total: number;
  pending: number;
  needClarification: number;
  overdue: number;
  completed: number;
  byStatus: Record<string, number>;
  // employee-only
  myUpcoming?: { _id: string; title: string; status: string; priority: string; dueDate?: string }[];
  myUrgent?: { _id: string; title: string; status: string; priority: string; dueDate?: string }[];
  // manager-only
  needsApproval?: { _id: string; title: string; status: string; priority: string; dueDate?: string; assigneeIds?: { _id: string; name: string }[] }[];
  needsClarificationList?: { _id: string; title: string; status: string; priority: string; dueDate?: string; assigneeIds?: { _id: string; name: string }[] }[];
  recentlyOverdue?: { _id: string; title: string; status: string; priority: string; dueDate?: string; assigneeIds?: { _id: string; name: string }[] }[];
  teamPerformance?: {
    userId: string;
    name: string;
    totalAssigned: number;
    completedCount: number;
    overdueCount: number;
    completionRate: number;
  }[];
}

const fetcher = (url: string) => apiFetch<DashboardStats>(url);

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, mutate } = useSWR("/api/dashboard/stats", fetcher);
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading || !data) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <p className="text-sm text-[var(--color-text-dim)]">Loading dashboard…</p>
      </div>
    );
  }

  const firstName = user?.name?.split(" ")[0] || "there";
  const isManagerView = data.scope === "team";

  return (
    <>
      {isManagerView ? (
        <ManagerDashboard data={data} firstName={firstName} onCreateTask={() => setShowCreate(true)} />
      ) : (
        <EmployeeDashboard data={data} firstName={firstName} />
      )}

      <CreateTaskModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => mutate()}
      />
    </>
  );
}
