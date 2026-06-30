"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiClientError } from "@/lib/utils/apiClient";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      // Critical: wait for AuthContext to actually know about the new user
      // BEFORE navigating. Without this, the dashboard layout's guard reads
      // the still-stale "logged out" state and bounces straight back here.
      await refresh();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">TaskFlow</h1>
          <p className="mt-1 text-sm text-[var(--color-text-dim)]">
            Every task. Every decision. One thread.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4"
        >
          <div>
            <Label>Work email</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

          <Button type="submit" loading={loading} className="w-full">
            Log in
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-[var(--color-text-dim)]">
          Got an invite code?{" "}
          <Link href="/join" className="text-[var(--color-accent)] hover:underline">
            Join your team
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-[var(--color-text-dim)]">
          New company?{" "}
          <Link href="/register" className="text-[var(--color-accent)] hover:underline">
            Create an organization
          </Link>
        </p>
      </div>
    </div>
  );
}
