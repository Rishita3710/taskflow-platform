"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { apiFetch } from "@/lib/utils/apiClient";

interface OrgUser {
  _id: string;
  name: string;
  email: string;
}

const fetcher = (url: string) => apiFetch<OrgUser[]>(url);

/**
 * A plain textarea that detects "@" followed by letters, shows a
 * filtered dropdown of organization members, and on selection inserts
 * "@Name " into the text while recording the user's ID separately
 * (mentions are sent to the API as an ID array, not parsed from text).
 */
export function MentionTextarea({
  value,
  onChange,
  onMentionsChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange: (ids: string[]) => void;
  placeholder?: string;
}) {
  const { data: users } = useSWR("/api/users", fetcher);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState("");
  const [mentionMap, setMentionMap] = useState<Record<string, string>>({});

  const filteredUsers =
    users?.filter((u) => u.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6) || [];

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value;
    onChange(newValue);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const match = textBeforeCursor.match(/@(\w*)$/);

    if (match) {
      setQuery(match[1]);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }

  function selectUser(user: OrgUser) {
    const cursorPos = textareaRef.current?.selectionStart ?? value.length;
    const textBeforeCursor = value.slice(0, cursorPos);
    const textAfterCursor = value.slice(cursorPos);
    const replaced = textBeforeCursor.replace(/@(\w*)$/, `@${user.name} `);

    const newValue = replaced + textAfterCursor;
    onChange(newValue);
    setShowDropdown(false);

    const updatedMap = { ...mentionMap, [user.name]: user._id };
    setMentionMap(updatedMap);
    onMentionsChange(Object.values(updatedMap));

    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        rows={3}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] outline-none focus:border-[var(--color-accent)] resize-none"
      />

      {showDropdown && filteredUsers.length > 0 && (
        <div className="absolute z-10 bottom-full mb-1 w-64 max-h-40 overflow-y-auto scrollbar-thin rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
          {filteredUsers.map((u) => (
            <button
              type="button"
              key={u._id}
              onClick={() => selectUser(u)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-surface-2)] transition-colors"
            >
              <span className="font-medium">{u.name}</span>
              <span className="text-[var(--color-text-dim)] text-xs ml-2">{u.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
