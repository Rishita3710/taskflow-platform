import clsx from "clsx";

export function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "warning" | "danger" | "clarify" | "success";
}) {
  const toneClasses: Record<string, string> = {
    default: "text-[var(--color-text)]",
    warning: "text-[var(--color-warning)]",
    danger: "text-[var(--color-danger)]",
    clarify: "text-[var(--color-clarify)]",
    success: "text-[var(--color-success)]",
  };

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="text-xs font-medium text-[var(--color-text-dim)]">{label}</p>
      <p className={clsx("mt-2 text-2xl font-semibold", toneClasses[tone])}>{value}</p>
    </div>
  );
}
