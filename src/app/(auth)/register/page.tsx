"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiClientError } from "@/lib/utils/apiClient";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [form, setForm] = useState({
    organizationName: "",
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      await refresh();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Set up your workspace</h1>
          <p className="mt-1 text-sm text-[var(--color-text-dim)]">
            You&#x2019;ll be the first Super Admin.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4"
        >
          <div>
            <Label>Company name</Label>
            <Input required value={form.organizationName} onChange={update("organizationName")} placeholder="Acme Inc." />
          </div>
          <div>
            <Label>Your full name</Label>
            <Input required value={form.name} onChange={update("name")} placeholder="Priya Sharma" />
          </div>
          <div>
            <Label>Work email</Label>
            <Input type="email" required value={form.email} onChange={update("email")} placeholder="you@company.com" />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" required minLength={8} value={form.password} onChange={update("password")} placeholder="At least 8 characters" />
          </div>

          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

          <Button type="submit" loading={loading} className="w-full">
            Create workspace
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-[var(--color-text-dim)]">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--color-accent)] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
