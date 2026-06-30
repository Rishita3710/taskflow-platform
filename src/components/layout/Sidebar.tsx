"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  ListTodo,
  Bell,
  LogOut,
  Users,
  MessageCircleQuestion,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isEmployee = user?.role === "employee";

  const navItems = isEmployee
    ? [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/tasks", label: "My Tasks", icon: ListTodo },
        { href: "/notifications", label: "Notifications", icon: Bell },
        { href: "/tasks?status=need_clarification", label: "My Questions", icon: MessageCircleQuestion },
      ]
    : [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/tasks", label: "All Tasks", icon: ListTodo },
        { href: "/team", label: "Team", icon: Users },
        { href: "/notifications", label: "Notifications", icon: Bell },
      ];

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="px-5 py-5 border-b border-[var(--color-border)]">
        <span className="text-lg font-semibold tracking-tight">TaskFlow</span>
        <p className="text-xs text-[var(--color-text-dim)] mt-0.5 capitalize">
          {user?.role.replace("_", " ")}
        </p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (!item.href.includes("?") && pathname?.startsWith(item.href + "/") && item.href !== "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--color-surface-2)] text-[var(--color-text)]"
                  : "text-[var(--color-text-dim)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {isEmployee && (
        <div className="mx-3 mb-3 rounded-md border border-[#1c3a63] bg-[#10243f] p-3">
          <p className="text-xs font-medium text-[var(--color-accent)]">
            Have a doubt?
          </p>
          <p className="text-xs text-[var(--color-text-dim)] mt-1">
            Open the task and ask in the Discussion tab. No calls needed.
          </p>
        </div>
      )}

      {user && (
        <div className="border-t border-[var(--color-border)] p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)] text-xs font-semibold text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-[var(--color-text-dim)] capitalize">
                {user.role.replace("_", " ")}
              </p>
            </div>
            <button
              onClick={logout}
              title="Log out"
              className="text-[var(--color-text-dim)] hover:text-[var(--color-danger)]"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
