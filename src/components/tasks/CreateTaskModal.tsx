"use client";

import { useState } from "react";
import useSWR from "swr";
import { apiFetch, ApiClientError } from "@/lib/utils/apiClient";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FileUploader, type UploadedFile } from "@/components/ui/FileUploader";

interface OrgUser {
  _id: string;
  name: string;
  email: string;
}

interface MiniTask {
  _id: string;
  title: string;
}

const usersFetcher = (url: string) => apiFetch<OrgUser[]>(url);
const tasksFetcher = (url: string) => apiFetch<{ tasks: MiniTask[] }>(url);

export function CreateTaskModal({
  open,
  onClose,
  onCreated,
  defaultParentTaskId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  /** Pre-fills the "subtask of" field — used by the "Add subtask" button on a task detail page. */
  defaultParentTaskId?: string;
}) {
  const { data: users } = useSWR(open ? "/api/users" : null, usersFetcher);
  const { data: taskList } = useSWR(open ? "/api/tasks?limit=50" : null, tasksFetcher);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [priority, setPriority] = useState("medium");
  const [visibility, setVisibility] = useState("team_only");
  const [dueDate, setDueDate] = useState("");
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [parentTaskId, setParentTaskId] = useState(defaultParentTaskId || "");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState("weekly");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setAssigneeIds([]);
    setDueDate("");
    setAttachments([]);
    setParentTaskId(defaultParentTaskId || "");
    setIsRecurring(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (assigneeIds.length === 0) {
      setError("Select at least one assignee.");
      return;
    }
    setLoading(true);
    try {
      const created = await apiFetch<{ _id: string }>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          assigneeIds,
          priority,
          visibility,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          parentTaskId: parentTaskId || undefined,
          recurrence: isRecurring
            ? { frequency: recurrenceFrequency, interval: recurrenceInterval }
            : undefined,
        }),
      });

      // Link any files the user attached during creation to the new task.
      for (const file of attachments) {
        await apiFetch(`/api/tasks/${created._id}/attachments`, {
          method: "POST",
          body: JSON.stringify(file),
        });
      }

      onCreated();
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to create task");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 max-h-[90vh] overflow-y-auto scrollbar-thin">
        <h2 className="text-base font-semibold mb-4">
          {defaultParentTaskId ? "New subtask" : "New task"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add context, requirements, or links…" />
          </div>

          <div>
            <Label>Assign to</Label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto scrollbar-thin">
              {users?.map((u) => (
                <button
                  type="button"
                  key={u._id}
                  onClick={() => toggleAssignee(u._id)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    assigneeIds.includes(u._id)
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                      : "border-[var(--color-border)] text-[var(--color-text-dim)]"
                  }`}
                >
                  {u.name}
                </button>
              ))}
              {!users?.length && (
                <p className="text-xs text-[var(--color-text-dim)]">No teammates found yet.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <Label>Visibility</Label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm"
              >
                <option value="public">Public</option>
                <option value="team_only">Team only</option>
                <option value="private">Private</option>
                <option value="confidential">Confidential</option>
              </select>
            </div>
          </div>

          <div>
            <Label>Due date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          {!defaultParentTaskId && (
            <div>
              <Label>Subtask of (optional)</Label>
              <select
                value={parentTaskId}
                onChange={(e) => setParentTaskId(e.target.value)}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm"
              >
                <option value="">None — this is a top-level task</option>
                {taskList?.tasks.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
              <span className="text-xs text-[var(--color-text-dim)]">Make this a recurring task</span>
            </label>
            {isRecurring && (
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={recurrenceFrequency}
                  onChange={(e) => setRecurrenceFrequency(e.target.value)}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <Input
                  type="number"
                  min={1}
                  value={recurrenceInterval}
                  onChange={(e) => setRecurrenceInterval(parseInt(e.target.value, 10) || 1)}
                  placeholder="Every N"
                />
              </div>
            )}
          </div>

          <div>
            <Label>Attachments</Label>
            <FileUploader files={attachments} onChange={setAttachments} />
          </div>

          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {defaultParentTaskId ? "Create subtask" : "Create task"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
