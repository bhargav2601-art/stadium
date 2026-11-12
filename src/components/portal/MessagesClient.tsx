"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AlertBanner, Card } from "@/components/ui/primitives";
import { formatWhen } from "@/lib/format";

type Peer = { id: string; name: string };
type Msg = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string };
  recipient: { id: string; name: string };
};

export function MessagesClient({
  currentUserId,
  peers,
  selectedPeer,
  messages,
}: {
  currentUserId: string;
  peers: Peer[];
  selectedPeer: Peer | null;
  messages: Msg[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!selectedPeer || !body.trim()) return;
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: selectedPeer.id, body }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not send message.");
        return;
      }
      setBody("");
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card>
        <h2 className="text-lg font-bold text-[var(--navy-900)]">Active Conversations</h2>
        <div className="mt-3 space-y-1.5">
          {peers.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              No messages yet. Visit <Link href="/portal/find-players" className="underline">Find Players</Link> to start a chat.
            </p>
          ) : (
            peers.map((p) => (
              <Link
                key={p.id}
                href={`/portal/messages?with=${p.id}`}
                className={`block rounded-xl px-3 py-2.5 text-sm font-semibold ${
                  selectedPeer?.id === p.id
                    ? "bg-[var(--navy-900)] text-white"
                    : "border border-[var(--border)] hover:bg-slate-50"
                }`}
              >
                {p.name}
              </Link>
            ))
          )}
        </div>
      </Card>

      <Card className="lg:col-span-2">
        {selectedPeer ? (
          <div className="space-y-4">
            <h2 className="border-b border-[var(--border)] pb-3 text-lg font-bold text-[var(--navy-900)]">
              Conversation with {selectedPeer.name}
            </h2>
            {error ? <AlertBanner tone="error" title={error} /> : null}
            <div className="max-h-96 space-y-2.5 overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Say hello to coordinate your next match.</p>
              ) : (
                messages.map((m) => {
                  const mine = m.senderId === currentUserId;
                  return (
                    <div
                      key={m.id}
                      className={`rounded-xl p-3 text-sm ${
                        mine ? "ml-8 bg-[var(--stadium-blue)] text-white" : "mr-8 bg-slate-100 text-[var(--ink)]"
                      }`}
                    >
                      <p>{m.body}</p>
                      <p className={`mt-1 text-[10px] ${mine ? "text-blue-100" : "text-slate-500"}`}>
                        {m.sender.name} · {formatWhen(m.createdAt)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
            <form onSubmit={onSend} className="flex gap-2">
              <label htmlFor="dm-input" className="visually-hidden">
                Write message
              </label>
              <input
                id="dm-input"
                required
                maxLength={1000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={`Message ${selectedPeer.name}...`}
                className="flex-1"
              />
              <button
                type="submit"
                disabled={sending}
                className="min-h-[44px] rounded-xl bg-[var(--lime)] px-5 py-2 text-sm font-bold text-[var(--lime-ink)]"
              >
                Send
              </button>
            </form>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            Select a player on the left or start a conversation from{" "}
            <Link href="/portal/find-players" className="font-semibold text-[var(--stadium-blue)] underline">
              Find Players
            </Link>
            .
          </p>
        )}
      </Card>
    </div>
  );
}
