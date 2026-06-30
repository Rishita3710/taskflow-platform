"use client";

import { useState } from "react";
import useSWR from "swr";
import { UserPlus, UserX, Copy, Check, Link2 } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/utils/apiClient";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { useAuth } from "@/lib/auth/AuthContext";
import { can } from "@/lib/auth/permissions";

interface OrgUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
}

interface InviteResult {
  code: string;
  joinUrl: string;
  intendedRole: string;
  expiresAt: string;
}

const ROLE_TONE: Record<string, "default" | "accent" | "warning" | "success"> = {
  super_admin: "warning",
  manager: "accent",
  team_lead: "success",
  employee: "default",
};

const fetcher = (url: string) => apiFetch<OrgUser[]>(url);

/** Generates a join code and shows it with a copy button */
function GenerateInviteSection() {
  const [role, setRole] = useState("employee");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await apiFetch<InviteResult>("/api/invites", {
        method: "POST",
        body: JSON.stringify({
          intendedRole: role,
          intendedEmail: email || undefined,
          intendedName: name || undefined,
        }),
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to generate code");
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    if (!result) return;
    navigator.clipboard.writeText(result.joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyCode() {
    if (!result) return;
    navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Link2 size={16} className="text-[var(--color-accent)]" />
        <h2 className="text-sm font-semibold">Generate employee invite</h2>
      </div>

      {!result ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Role</Label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text)]"
              >
                <option value="employee">Employee</option>
                <option value="team_lead">Team Lead</option>
              </select>
            </div>
            <div>
              <Label>Their name (optional)</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rahul Sharma"
              />
            </div>
            <div>
              <Label>Their email (optional)</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rahul@company.com"
              />
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-dim)]">
            Name and email are optional — if you add them, the join form pre-fills those fields. If you add an email, only that exact email can use the code.
          </p>
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <Button onClick={generate} loading={loading}>
            Generate invite code
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* The code itself - big and prominent */}
          <div className="rounded-lg border-2 border-[var(--color-accent)] bg-[#10243f] p-4 text-center">
            <p className="text-xs text-[var(--color-text-dim)] mb-1">Share this code with your employee</p>
            <p className="text-3xl font-bold tracking-[0.2em] font-mono text-[var(--color-accent)]">
              {result.code}
            </p>
            <p className="text-xs text-[var(--color-text-dim)] mt-2">
              Expires {new Date(result.expiresAt).toLocaleDateString()} · Single use · Role: {result.intendedRole.replace("_", " ")}
            </p>
          </div>

          {/* Join URL */}
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
            <p className="text-xs text-[var(--color-text-dim)] mb-1">Or share this link directly</p>
            <p className="text-xs font-mono text-[var(--color-text)] break-all">{result.joinUrl}</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={copyCode} variant="secondary" className="flex-1">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              Copy code
            </Button>
            <Button onClick={copyLink} className="flex-1">
              {copied ? <Check size={14} /> : <Link2 size={14} />}
              Copy link
            </Button>
          </div>

          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-xs text-[var(--color-text-dim)] space-y-1">
            <p className="font-medium text-[var(--color-text)]">Tell your employee:</p>
            <p>1. Go to <span className="text-[var(--color-accent)]">{window.location.origin}/join</span></p>
            <p>2. Enter the code: <span className="font-mono font-bold text-[var(--color-accent)]">{result.code}</span></p>
            <p>3. Set their name, email, and password</p>
            <p>4. They are in — no approval needed</p>
          </div>

          <button
            onClick={() => { setResult(null); setEmail(""); setName(""); }}
            className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
          >
            Generate another code
          </button>
        </div>
      )}
    </div>
  );
}

function AddMemberModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  if (!open) return null;

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setSuccess(
        `${form.name} has been added! They can now log in at /login with email: ${form.email} and the password you set.`
      );
      setForm({ name: "", email: "", password: "", role: "employee" });
      onAdded();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to add member");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="text-base font-semibold mb-1">Add team member</h2>
        <p className="text-xs text-[var(--color-text-dim)] mb-5">
          The employee will log in at{" "}
          <span className="text-[var(--color-accent)]">/login</span> using the
          email and password you set here.
        </p>

        {success ? (
          <div className="rounded-lg border border-[#1e4a30] bg-[#10301f] p-4 mb-4">
            <p className="text-sm text-[var(--color-success)]">{success}</p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Full name</Label>
            <Input
              required
              value={form.name}
              onChange={update("name")}
              placeholder="Rahul Sharma"
            />
          </div>
          <div>
            <Label>Work email</Label>
            <Input
              type="email"
              required
              value={form.email}
              onChange={update("email")}
              placeholder="rahul@yourcompany.com"
            />
          </div>
          <div>
            <Label>Password (they can change it later)</Label>
            <Input
              type="text"
              required
              minLength={6}
              value={form.password}
              onChange={update("password")}
              placeholder="Set a temporary password"
            />
          </div>
          <div>
            <Label>Role</Label>
            <select
              value={form.role}
              onChange={update("role")}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text)]"
            >
              <option value="employee">Employee — can view & work on assigned tasks</option>
              <option value="team_lead">Team Lead — can create tasks, approve, see internal notes</option>
              <option value="manager">Manager — full access (only Super Admin can set this)</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-[var(--color-danger)]">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              {success ? "Close" : "Cancel"}
            </Button>
            {!success && (
              <Button type="submit" loading={loading}>
                <UserPlus size={15} /> Add member
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const { user } = useAuth();
  const { data, mutate } = useSWR("/api/users", fetcher);
  const [showAdd, setShowAdd] = useState(false);
  const [actionError, setActionError] = useState("");

  const canInvite = user && can(user.role, "user:invite");
  const canManageRoles = user && can(user.role, "user:manage_roles");

  async function deactivate(memberId: string, name: string) {
    if (!confirm(`Deactivate ${name}? They won't be able to log in anymore.`)) return;
    setActionError("");
    try {
      await apiFetch(`/api/users/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: false }),
      });
      mutate();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : "Failed to deactivate");
    }
  }

  async function changeRole(memberId: string, role: string) {
    setActionError("");
    try {
      await apiFetch(`/api/users/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      mutate();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : "Failed to update role");
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Team</h1>
          <p className="text-sm text-[var(--color-text-dim)] mt-1">
            {data?.length ?? 0} members in your organization
          </p>
        </div>
        {canInvite && (
          <Button variant="secondary" onClick={() => setShowAdd(true)}>
            <UserPlus size={16} /> Add directly
          </Button>
        )}
      </div>

      {/* Invite code generator */}
      {canInvite && <GenerateInviteSection />}

      {actionError && (
        <p className="text-sm text-[var(--color-danger)] mb-4">{actionError}</p>
      )}

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-0">
          {/* Header */}
          <div className="px-5 py-3 text-xs font-medium text-[var(--color-text-dim)] border-b border-[var(--color-border)]">
            Member
          </div>
          <div className="px-5 py-3 text-xs font-medium text-[var(--color-text-dim)] border-b border-[var(--color-border)]">
            Role
          </div>
          <div className="px-5 py-3 text-xs font-medium text-[var(--color-text-dim)] border-b border-[var(--color-border)]">
            Status
          </div>
          <div className="px-5 py-3 border-b border-[var(--color-border)]" />

          {/* Rows */}
          {data?.map((member) => (
            <>
              <div
                key={`${member._id}-name`}
                className="px-5 py-4 border-b border-[var(--color-border)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-sm font-semibold flex-shrink-0">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {member.name}
                      {member._id === user?.id && (
                        <span className="ml-2 text-xs text-[var(--color-text-dim)]">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--color-text-dim)]">
                      {member.email}
                    </p>
                  </div>
                </div>
              </div>

              <div
                key={`${member._id}-role`}
                className="px-5 py-4 border-b border-[var(--color-border)] flex items-center"
              >
                {canManageRoles && member._id !== user?.id ? (
                  <select
                    value={member.role}
                    onChange={(e) => changeRole(member._id, e.target.value)}
                    className="rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1 text-xs text-[var(--color-text)]"
                  >
                    <option value="employee">Employee</option>
                    <option value="team_lead">Team Lead</option>
                    {user?.role === "super_admin" && (
                      <option value="manager">Manager</option>
                    )}
                  </select>
                ) : (
                  <Badge tone={ROLE_TONE[member.role] || "default"}>
                    {member.role.replace("_", " ")}
                  </Badge>
                )}
              </div>

              <div
                key={`${member._id}-status`}
                className="px-5 py-4 border-b border-[var(--color-border)] flex items-center"
              >
                <Badge tone={member.isActive === false ? "danger" : "success"}>
                  {member.isActive === false ? "Inactive" : "Active"}
                </Badge>
              </div>

              <div
                key={`${member._id}-actions`}
                className="px-5 py-4 border-b border-[var(--color-border)] flex items-center"
              >
                {canManageRoles &&
                  member._id !== user?.id &&
                  member.isActive !== false && (
                    <button
                      onClick={() => deactivate(member._id, member.name)}
                      title="Deactivate this member"
                      className="text-[var(--color-text-dim)] hover:text-[var(--color-danger)] transition-colors"
                    >
                      <UserX size={16} />
                    </button>
                  )}
              </div>
            </>
          ))}

          {!data?.length && (
            <div className="col-span-4 px-5 py-8 text-center text-sm text-[var(--color-text-dim)]">
              No team members yet. Click &quot;Add member&quot; to invite your first employee.
            </div>
          )}
        </div>
      </div>

      <AddMemberModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdded={() => mutate()}
      />
    </div>
  );
}
