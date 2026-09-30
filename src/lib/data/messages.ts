import { createClient } from "@/lib/supabase/client";

export interface ThreadMessage {
  id: string;
  from: "me" | "peer";
  text: string;
  createdAt: string;
}

/**
 * One inbox row per person the user can talk to: everyone they're actively
 * matched with, plus anyone they already have a thread with. `threadId` is
 * null until the first message is sent.
 */
export interface Conversation {
  peerId: string;
  peerName: string;
  peerRole: string;
  threadId: string | null;
  lastMessage: string;
  lastAt: string | null;
  unread: number;
  messages: ThreadMessage[];
}

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  const supabase = createClient();
  const [{ data: threads }, { data: matches }] = await Promise.all([
    supabase
      .from("message_threads")
      .select("*")
      .or(`participant_a.eq.${userId},participant_b.eq.${userId}`),
    supabase
      .from("mentee_mentor_matches")
      .select("mentor_id, mentee_id")
      .eq("status", "active")
      .or(`mentor_id.eq.${userId},mentee_id.eq.${userId}`),
  ]);

  const threadByPeer = new Map(
    (threads ?? []).map((t) => [t.participant_a === userId ? t.participant_b : t.participant_a, t.id])
  );
  const peerIds = [
    ...new Set([
      ...threadByPeer.keys(),
      ...(matches ?? []).map((m) => (m.mentor_id === userId ? m.mentee_id : m.mentor_id)),
    ]),
  ];
  if (!peerIds.length) return [];

  const [{ data: peers }, { data: allMessages }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role").in("id", peerIds),
    supabase
      .from("messages")
      .select("*")
      .in("thread_id", [...threadByPeer.values()])
      .order("created_at", { ascending: true }),
  ]);
  const peerMap = new Map((peers ?? []).map((p) => [p.id, p]));

  return peerIds
    .map((peerId) => {
      const threadId = threadByPeer.get(peerId) ?? null;
      const raw = (allMessages ?? []).filter((m) => m.thread_id === threadId);
      const messages = raw.map((m) => ({
        id: m.id,
        from: (m.sender_id === userId ? "me" : "peer") as "me" | "peer",
        text: m.body,
        createdAt: m.created_at,
      }));
      const last = messages[messages.length - 1];
      const peer = peerMap.get(peerId);
      return {
        peerId,
        peerName: peer?.full_name ?? "Unknown",
        peerRole: peer?.role ?? "",
        threadId,
        lastMessage: last?.text ?? "",
        lastAt: last?.createdAt ?? null,
        unread: raw.filter((m) => m.sender_id !== userId && !m.read_at).length,
        messages,
      };
    })
    .sort((a, b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? "") || a.peerName.localeCompare(b.peerName));
}

/** Sends a message, creating the thread on first contact. Returns the thread id. */
export async function sendMessage(userId: string, conversation: Conversation, body: string): Promise<string> {
  const threadId = conversation.threadId ?? (await getOrCreateThread(userId, conversation.peerId));
  const supabase = createClient();
  const { error } = await supabase.from("messages").insert({
    thread_id: threadId,
    sender_id: userId,
    body,
  });
  if (error) throw new Error(error.message);
  return threadId;
}

export async function markThreadRead(threadId: string) {
  const supabase = createClient();
  await supabase.rpc("mark_thread_read", { p_thread: threadId });
}

/** Calls `onChange` whenever a message the user can see is inserted. */
export function subscribeToMessages(userId: string, onChange: () => void): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`messages:${userId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

/** Finds or creates the 1:1 thread between the current user and a peer. */
export async function getOrCreateThread(userId: string, peerId: string): Promise<string> {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("message_threads")
    .select("id")
    .or(
      `and(participant_a.eq.${userId},participant_b.eq.${peerId}),and(participant_a.eq.${peerId},participant_b.eq.${userId})`
    )
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("message_threads")
    .insert({ participant_a: userId, participant_b: peerId })
    .select("id")
    .single();
  if (error || !created) {
    throw new Error(
      error?.code === "42501"
        ? "You can only message people you're actively matched with."
        : error?.message ?? "Failed to start conversation."
    );
  }
  return created.id;
}

export function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}
