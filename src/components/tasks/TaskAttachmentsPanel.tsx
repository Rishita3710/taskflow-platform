"use client";

import { useState } from "react";
import useSWR from "swr";
import { apiFetch, ApiClientError } from "@/lib/utils/apiClient";
import { FileUploader, AttachmentList, type UploadedFile } from "@/components/ui/FileUploader";
import { canViewInternalContent } from "@/lib/auth/permissions";
import { useAuth } from "@/lib/auth/AuthContext";

interface AttachmentData extends UploadedFile {
  isPrivate: boolean;
  uploadedBy?: { name: string };
}

const fetcher = (url: string) => apiFetch<AttachmentData[]>(url);

export function TaskAttachmentsPanel({ taskId }: { taskId: string }) {
  const { user } = useAuth();
  const { data, mutate } = useSWR(`/api/tasks/${taskId}/attachments`, fetcher);
  const [pendingFiles, setPendingFiles] = useState<UploadedFile[]>([]);
  const [markPrivate, setMarkPrivate] = useState(false);
  const [error, setError] = useState("");

  const canMarkPrivate = user && canViewInternalContent(user.role);

  async function attachPending(files: UploadedFile[]) {
    const newFiles = files.slice(pendingFiles.length);
    setPendingFiles(files);
    for (const file of newFiles) {
      try {
        await apiFetch(`/api/tasks/${taskId}/attachments`, {
          method: "POST",
          body: JSON.stringify({ ...file, isPrivate: markPrivate }),
        });
        mutate();
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : "Failed to attach file");
      }
    }
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <h2 className="text-sm font-semibold">Attachments {data && data.length > 0 && `(${data.length})`}</h2>
      </div>
      <div className="p-4 space-y-3">
        {data && data.length > 0 && <AttachmentList attachments={data} />}

        <div>
          <FileUploader files={pendingFiles} onChange={attachPending} />
          {canMarkPrivate && (
            <label className="flex items-center gap-1.5 cursor-pointer mt-2 text-xs text-[var(--color-text-dim)]">
              <input type="checkbox" checked={markPrivate} onChange={(e) => setMarkPrivate(e.target.checked)} />
              Mark new uploads as private (hidden from employees)
            </label>
          )}
          {error && <p className="text-xs text-[var(--color-danger)] mt-1">{error}</p>}
        </div>
      </div>
    </div>
  );
}
