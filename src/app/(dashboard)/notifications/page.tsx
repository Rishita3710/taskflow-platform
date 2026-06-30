"use client";

import useSWR from "swr";
import Link from "next/link";
import { apiFetch } from "@/lib/utils/apiClient";
import { Badge } from "@/components/ui/Badge";

interface NotificationItem {
  _id: string;
  message: string;
  type: string;
  taskId?: string;
  isRead: boolean;
  createdAt: string;
}

const fetcher = (url: string) => apiFetch<NotificationItem[]>(url);

export default function NotificationsPage() {
  const { data, mutate } = useSWR("/api/notifications", fetcher);

  async function markRead(id: string) {
    await apiFetch(`/api/notifications/${id}`, { method: "PATCH" });
    mutate();
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-6">Notifications</h1>

      <div className="space-y-2">
        {data?.length === 0 && (
          <p className="text-sm text-[var(--color-text-dim)]">You&#x2019;re all caught up.</p>
        )}
        {data?.map((n) => (
          <div
            key={n._id}
            className={`flex items-center justify-between gap-4 rounded-lg border p-4 ${
              n.isRead
                ? "border-[var(--color-border)] bg-[var(--color-surface)]"
                : "border-[var(--color-accent)] bg-[var(--color-surface-2)]"
            }`}
          >
            <div className="flex-1">
              <p className="text-sm">{n.message}</p>
              <p className="text-xs text-[var(--color-text-dim)] mt-1">
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!n.isRead && <Badge tone="accent">New</Badge>}
              {n.taskId && (
                <Link
                  href={`/tasks/${n.taskId}`}
                  onClick={() => !n.isRead && markRead(n._id)}
                  className="text-xs text-[var(--color-accent)] hover:underline"
                >
                  View task
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
