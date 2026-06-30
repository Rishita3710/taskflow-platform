"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { apiFetch, ApiClientError } from "@/lib/utils/apiClient";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth/AuthContext";
import { canViewInternalContent } from "@/lib/auth/permissions";
import { useTaskSocket } from "@/lib/socket/useTaskSocket";
import { FileUploader, AttachmentList, type UploadedFile } from "@/components/ui/FileUploader";
import { MentionTextarea } from "@/components/tasks/MentionTextarea";

interface CommentAuthor {
  _id: string;
  name: string;
  role: string;
}

interface CommentData {
  _id: string;
  body: string;
  authorId: CommentAuthor;
  isInternal: boolean;
  isClarificationRequest: boolean;
  isDecision: boolean;
  createdAt: string;
  mentions?: { _id: string; name: string }[];
  attachments?: UploadedFile[];
}

const fetcher = (url: string) => apiFetch<CommentData[]>(url);

export function DiscussionThread({ taskId }: { taskId: string }) {
  const { user } = useAuth();
  const { data: comments, mutate } = useSWR(`/api/tasks/${taskId}/comments`, fetcher);

  const [body, setBody] = useState("");
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [isInternal, setIsInternal] = useState(false);
  const [isClarification, setIsClarification] = useState(false);
  const [isDecision, setIsDecision] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const canPostInternal = user && canViewInternalContent(user.role);

  useTaskSocket(taskId, () => {
    mutate();
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments?.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setError("");
    setLoading(true);
    try {
      await apiFetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        body: JSON.stringify({
          body,
          mentions: mentionIds,
          attachments,
          isInternal,
          isClarificationRequest: isClarification,
          isDecision,
        }),
      });
      setBody("");
      setMentionIds([]);
      setAttachments([]);
      setIsInternal(false);
      setIsClarification(false);
      setIsDecision(false);
      mutate();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to post comment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-4 pr-1">
        {comments?.length === 0 && (
          <p className="text-sm text-[var(--color-text-dim)] text-center py-8">
            No discussion yet. Ask a question instead of picking up the phone — it stays here forever.
          </p>
        )}
        {comments?.map((c) => (
          <div
            key={c._id}
            className={`rounded-lg border p-3 ${
              c.isInternal
                ? "border-[#3f2657] bg-[#1a1424]"
                : "border-[var(--color-border)] bg-[var(--color-surface)]"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{c.authorId?.name}</span>
                <span className="text-xs text-[var(--color-text-dim)] capitalize">
                  {c.authorId?.role?.replace("_", " ")}
                </span>
              </div>
              <span className="text-xs text-[var(--color-text-dim)]">
                {new Date(c.createdAt).toLocaleString()}
              </span>
            </div>

            <p className="text-sm whitespace-pre-wrap">{c.body}</p>

            {c.mentions && c.mentions.length > 0 && (
              <p className="text-xs text-[var(--color-accent)] mt-1">
                {c.mentions.map((m) => `@${m.name}`).join(" ")}
              </p>
            )}

            {c.attachments && c.attachments.length > 0 && (
              <div className="mt-2">
                <AttachmentList attachments={c.attachments} />
              </div>
            )}

            <div className="mt-2 flex gap-1.5 flex-wrap">
              {c.isInternal && <Badge tone="clarify">Internal note</Badge>}
              {c.isClarificationRequest && <Badge tone="warning">Clarification request</Badge>}
              {c.isDecision && <Badge tone="success">Decision logged</Badge>}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 border-t border-[var(--color-border)] pt-4 space-y-2">
        <MentionTextarea
          value={body}
          onChange={setBody}
          onMentionsChange={setMentionIds}
          placeholder="Ask a question, share an update, or leave a decision note… type @ to mention someone"
        />

        <FileUploader files={attachments} onChange={setAttachments} />

        <div className="flex items-center gap-4 flex-wrap text-xs text-[var(--color-text-dim)]">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={isClarification} onChange={(e) => setIsClarification(e.target.checked)} />
            Need clarification (notifies manager, flags task)
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={isDecision} onChange={(e) => setIsDecision(e.target.checked)} />
            Log as decision
          </label>
          {canPostInternal && (
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
              Internal only (hidden from employees)
            </label>
          )}
        </div>

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

        <div className="flex justify-end">
          <Button type="submit" loading={loading}>
            Post
          </Button>
        </div>
      </form>
    </div>
  );
}
