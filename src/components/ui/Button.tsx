"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  loading,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary" && "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-dim)]",
        variant === "secondary" && "bg-[var(--color-surface-2)] text-[var(--color-text)] border border-[var(--color-border)] hover:border-[var(--color-accent)]",
        variant === "danger" && "bg-[var(--color-danger)] text-white hover:opacity-90",
        variant === "ghost" && "bg-transparent text-[var(--color-text-dim)] hover:text-[var(--color-text)]",
        className
      )}
      {...props}
    >
      {loading ? "Working…" : children}
    </button>
  );
}
