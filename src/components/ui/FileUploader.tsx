"use client";

import { useRef, useState } from "react";
import { Paperclip, X, Loader2 } from "lucide-react";
import { ApiClientError } from "@/lib/utils/apiClient";

export interface UploadedFile {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export function FileUploader({
  files,
  onChange,
}: {
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    setError("");
    setUploading(true);
    try {
      const uploaded: UploadedFile[] = [];
      for (const file of Array.from(selected)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/uploads", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        const json = await res.json();
        if (!res.ok || json.success === false) {
          throw new ApiClientError(json?.error?.message || "Upload failed", res.status);
        }
        uploaded.push(json.data);
      }
      onChange([...files, ...uploaded]);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to upload file");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:border-[var(--color-accent)] transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
          {uploading ? "Uploading…" : "Attach file"}
        </button>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
      </div>

      {error && <p className="text-xs text-[var(--color-danger)] mt-1.5">{error}</p>}

      {files.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {files.map((f, i) => (
            <div
              key={`${f.fileUrl}-${i}`}
              className="flex items-center justify-between gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs"
            >
              <a href={f.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent)] hover:underline truncate">
                {f.fileName}
              </a>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[var(--color-text-dim)]">{(f.fileSize / 1024).toFixed(0)} KB</span>
                <button type="button" onClick={() => removeFile(i)} className="text-[var(--color-text-dim)] hover:text-[var(--color-danger)]">
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AttachmentList({ attachments }: { attachments: (UploadedFile & { isPrivate?: boolean; uploadedBy?: { name: string } })[] }) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {attachments.map((f, i) => (
        <a
          key={`${f.fileUrl}-${i}`}
          href={f.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs hover:border-[var(--color-accent)] transition-colors"
        >
          <span className="flex items-center gap-1.5 text-[var(--color-accent)] truncate">
            <Paperclip size={12} />
            {f.fileName}
          </span>
          <span className="text-[var(--color-text-dim)] flex-shrink-0">
            {f.isPrivate && "🔒 "}
            {(f.fileSize / 1024).toFixed(0)} KB
          </span>
        </a>
      ))}
    </div>
  );
}
