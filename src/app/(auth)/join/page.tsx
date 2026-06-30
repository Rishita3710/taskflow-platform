"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiClientError } from "@/lib/utils/apiClient";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthContext";

interface InviteInfo {
  code: string;
  organizationName: string;
  intendedRole: string;
  intendedEmail: string;
  intendedName: string;
  expiresAt: string;
}

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();

  const [code, setCode] = useState(() => searchParams.get("code") || "");
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [codeError, setCodeError] = useState("");
  const [checkingCode, setCheckingCode] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const urlCode = searchParams.get("code");
    if (urlCode) {
      checkCode(urlCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkCode(codeToCheck?: string) {
    const c = (codeToCheck || code).trim().toUpperCase();
    if (!c) { setCodeError("Enter your invite code."); return; }
    setCodeError("");
    setCheckingCode(true);
    try {
      const data = await apiFetch<InviteInfo>(`/api/invites/${c}`);
      setInvite(data);
      if (data.intendedEmail) setEmail(data.intendedEmail);
      if (data.intendedName) setName(data.intendedName);
    } catch (err) {
      setInvite(null);
      setCodeError(err instanceof ApiClientError ? err.message : "Could not validate code. Try again.");
    } finally {
      setCheckingCode(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setLoading(true);
    try {
      await apiFetch(`/api/invites/${invite!.code}`, {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      await refresh();
      router.push("/dashboard");
    } catch (err) {
      setSubmitError(err instanceof ApiClientError ? err.message : "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!invite && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4">
          <div>
            <Label>Your invite code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="TF-XXXXXX"
              className="tracking-widest font-mono text-center text-lg"
              onKeyDown={(e) => e.key === "Enter" && checkCode()}
            />
            <p className="text-xs text-[var(--color-text-dim)] mt-1.5">
              Ask your manager for this code.
            </p>
          </div>
          {codeError && <p className="text-sm text-[var(--color-danger)]">{codeError}</p>}
          <Button onClick={() => checkCode()} loading={checkingCode} className="w-full">
            Verify code
          </Button>
        </div>
      )}

      {invite && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4">
          <div className="rounded-md border border-[#1c3a63] bg-[#10243f] px-4 py-3">
            <p className="text-xs text-[var(--color-text-dim)]">Joining</p>
            <p className="text-sm font-semibold text-[var(--color-accent)]">{invite.organizationName}</p>
            <p className="text-xs text-[var(--color-text-dim)] mt-0.5 capitalize">
              Role: {invite.intendedRole.replace("_", " ")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Your full name</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Rahul Sharma" />
            </div>
            <div>
              <Label>Work email</Label>
              <Input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                readOnly={!!invite.intendedEmail}
                className={invite.intendedEmail ? "opacity-60 cursor-not-allowed" : ""}
              />
              {invite.intendedEmail && (
                <p className="text-xs text-[var(--color-text-dim)] mt-1">This invite is locked to this email.</p>
              )}
            </div>
            <div>
              <Label>Choose a password</Label>
              <Input
                type="password" required minLength={6}
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>

            {submitError && <p className="text-sm text-[var(--color-danger)]">{submitError}</p>}

            <Button type="submit" loading={loading} className="w-full">
              Create account &amp; join
            </Button>
          </form>

          <button
            onClick={() => { setInvite(null); setCode(""); }}
            className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text)] w-full text-center"
          >
            Use a different code
          </button>
        </div>
      )}
    </>
  );
}

export default function JoinPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">TaskFlow</h1>
          <p className="mt-1 text-sm text-[var(--color-text-dim)]">Join your team</p>
        </div>

        <Suspense fallback={
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <p className="text-sm text-[var(--color-text-dim)] text-center">Loading...</p>
          </div>
        }>
          <JoinForm />
        </Suspense>

        <p className="mt-4 text-center text-sm text-[var(--color-text-dim)]">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--color-accent)] hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
