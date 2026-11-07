"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { PageShell, SoftPanel, SoftInput, SoftButton, StatusBadge, EmptyState } from "@/components/app/ui";
import { useAuth } from "@/lib/auth/auth-context";
import {
  fetchConversations,
  formatMessageTime,
  markThreadRead,
  sendMessage,
  subscribeToMessages,
  type Conversation,
} from "@/lib/data/messages";

/** Fallback refresh in case Realtime isn't enabled for `messages`. */
const POLL_MS = 15000;

export function MessagesView({
  description,
  emptyDescription,
  includeAllProfiles = false,
}: {
  description: string;
  emptyDescription: string;
  includeAllProfiles?: boolean;
}) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activePeerId, setActivePeerId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const list = await fetchConversations(user.id, includeAllProfiles);
    setConversations(list);
    setActivePeerId((current) => {
      if (current && list.some((c) => c.peerId === current)) return current;
      // Deep link from e.g. the mentee roster: /mentor/messages?with=<id>
      const wanted = new URLSearchParams(window.location.search).get("with");
      return list.find((c) => c.peerId === wanted)?.peerId ?? list[0]?.peerId ?? null;
    });
    setLoading(false);
  }, [user, includeAllProfiles]);

  useEffect(() => {
    if (!user) return;
    load();
    const unsubscribe = subscribeToMessages(user.id, load);
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => {
      unsubscribe();
      clearInterval(poll);
    };
  }, [user, load]);

  const active = conversations.find((c) => c.peerId === activePeerId);

  // Mark the open conversation read.
  useEffect(() => {
    if (!active?.threadId || active.unread === 0) return;
    const { threadId, peerId } = active;
    markThreadRead(threadId).then(() =>
      setConversations((prev) => prev.map((c) => (c.peerId === peerId ? { ...c, unread: 0 } : c)))
    );
  }, [active]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [activePeerId, active?.messages.length]);

  const handleSend = async () => {
    if (!user || !active || !draft.trim() || sending) return;
    const text = draft.trim();
    setError("");
    setSending(true);
    try {
      await sendMessage(user.id, active, text);
      setDraft("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message failed to send.");
    } finally {
      setSending(false);
    }
  };

  if (!loading && conversations.length === 0) {
    return (
      <PageShell title="Messages" description={description}>
        <EmptyState title="No conversations yet" description={emptyDescription} />
      </PageShell>
    );
  }

  return (
    <PageShell title="Messages" description={description}>
      <div className="grid min-h-[480px] gap-5 lg:grid-cols-[280px_1fr]">
        <SoftPanel className="overflow-hidden !p-0">
          <div className="border-b border-soft px-6 py-4">
            <h2 className="text-base font-semibold text-ink">Conversations</h2>
          </div>
          {conversations.map((c) => (
            <button
              key={c.peerId}
              type="button"
              onClick={() => {
                setActivePeerId(c.peerId);
                setError("");
              }}
              className={`w-full border-b border-soft px-5 py-3.5 text-left last:border-0 ${
                activePeerId === c.peerId ? "bg-soft-tint" : "hover:bg-soft-muted/60"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-ink">{c.peerName}</p>
                {c.unread > 0 ? (
                  <span className="rounded-full bg-forest px-1.5 text-[10px] font-semibold text-paper">
                    {c.unread}
                  </span>
                ) : (
                  <span className="text-[10px] text-ink/40">{c.lastAt ? formatMessageTime(c.lastAt) : ""}</span>
                )}
              </div>
              <p className="truncate text-[11px] capitalize text-ink/40">{c.peerRole}</p>
              <p className="mt-1 truncate text-xs text-ink/55">{c.lastMessage || "No messages yet"}</p>
            </button>
          ))}
        </SoftPanel>

        {active && (
          <SoftPanel title={active.peerName} subtitle={active.peerRole} className="flex flex-col">
            <div className="max-h-[60vh] min-h-[240px] flex-1 space-y-3 overflow-y-auto pr-1">
              {active.messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[80%] rounded-soft px-4 py-2.5 text-sm ${
                    m.from === "me" ? "ml-auto bg-forest text-paper" : "bg-soft-muted text-ink"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <p className={`mt-1 text-[10px] ${m.from === "me" ? "text-paper/60" : "text-ink/40"}`}>
                    {formatMessageTime(m.createdAt)}
                  </p>
                </div>
              ))}
              {active.messages.length === 0 && (
                <StatusBadge tone="neutral">No messages yet — say hello.</StatusBadge>
              )}
              <div ref={bottomRef} />
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="mt-4 flex gap-2 border-t border-soft pt-4"
            >
              <SoftInput
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Message ${active.peerName}`}
                className="flex-1"
                maxLength={4000}
              />
              <SoftButton type="submit" disabled={sending || !draft.trim()} aria-label="Send message">
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send</span>
              </SoftButton>
            </form>
          </SoftPanel>
        )}
      </div>
    </PageShell>
  );
}
