import clsx from "clsx";

type BadgeTone = "default" | "success" | "warning" | "danger" | "accent" | "clarify";

const TONE_CLASSES: Record<BadgeTone, string> = {
  default: "bg-[var(--color-surface-2)] text-[var(--color-text-dim)] border-[var(--color-border)]",
  success: "bg-[#10301f] text-[var(--color-success)] border-[#1e4a30]",
  warning: "bg-[#332708] text-[var(--color-warning)] border-[#4a3a10]",
  danger: "bg-[#3a1414] text-[var(--color-danger)] border-[#5a1f1f]",
  accent: "bg-[#10243f] text-[var(--color-accent)] border-[#1c3a63]",
  clarify: "bg-[#2a1a3a] text-[var(--color-clarify)] border-[#3f2657]",
};

export function Badge({ tone = "default", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[tone]
      )}
    >
      {children}
    </span>
  );
}

export const STATUS_TONE: Record<string, BadgeTone> = {
  todo: "default",
  in_progress: "accent",
  need_clarification: "clarify",
  under_review: "warning",
  completed: "success",
  rejected: "danger",
  reopened: "warning",
};

export const PRIORITY_TONE: Record<string, BadgeTone> = {
  low: "default",
  medium: "accent",
  high: "warning",
  urgent: "danger",
};

export function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
