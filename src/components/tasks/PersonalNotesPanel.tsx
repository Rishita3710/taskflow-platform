"use client";

import { useState } from "react";
import useSWR from "swr";
import { Lock, ChevronDown, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/utils/apiClient";
import { Textarea } from "@/components/ui/Input";

interface NoteData {
  body: string;
}

const fetcher = (url: string) => apiFetch<NoteData>(url);

/**
 * Inner editor — only mounted once `data` has actually loaded, via a
 * `key` on the parent that forces a fresh mount per taskId. This is
 * the standard React pattern for "initialize local state from fetched
 * data once" without fighting the rules around effects/refs during render.
 */
function NoteEditor({
  taskId,
  initialBody,
  mutate,
}: {
  taskId: string;
  initialBody: string;
  mutate: (data: NoteData, opts: { revalidate: boolean }) => void;
}) {
  const [body, setBody] = useState(initialBody);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [saveTimeout, setSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(value: string) {
    setBody(value);
    if (saveTimeout) clearTimeout(saveTimeout);
    const t = setTimeout(async () => {
      setSaveState("saving");
      try {
        await apiFetch(`/api/tasks/${taskId}/notes`, {
          method: "PUT",
          body: JSON.stringify({ body: value }),
        });
        setSaveState("saved");
        mutate({ body: value }, { revalidate: false });
      } catch {
        setSaveState("idle");
      }
    }, 800);
    setSaveTimeout(t);
  }

  return (
    <div className="px-4 pb-4">
      <p className="text-xs text-[var(--color-text-dim)] mb-2">
        Only visible to you — not shown to your manager or anyone else.
      </p>
      <Textarea
        rows={4}
        value={body}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Jot down anything for yourself about this task…"
      />
      <p className="text-xs text-[var(--color-text-dim)] mt-1.5 h-4">
        {saveState === "saving" && "Saving…"}
        {saveState === "saved" && "Saved"}
      </p>
    </div>
  );
}

export function PersonalNotesPanel({ taskId }: { taskId: string }) {
  const { data, mutate } = useSWR(`/api/tasks/${taskId}/notes`, fetcher);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--color-surface-2)] transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <Lock size={14} className="text-[var(--color-text-dim)]" />
          My private notes
        </span>
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      {expanded && data && (
        <NoteEditor key={taskId} taskId={taskId} initialBody={data.body || ""} mutate={mutate} />
      )}
    </div>
  );
}
