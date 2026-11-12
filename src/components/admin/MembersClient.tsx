"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertBanner, Badge, Card, StatusPill } from "@/components/ui/primitives";
import { formatWhen } from "@/lib/format";

type MemberRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  blocked: boolean;
  membershipStatus: string;
  expiresAt: string | null;
  noShowCount: number;
  flaggedForReview: boolean;
};

export function MembersClient({
  currentUserId,
  canAssignAdminRoles,
  members,
}: {
  currentUserId: string;
  canAssignAdminRoles: boolean;
  members: MemberRow[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (flaggedOnly && !m.flaggedForReview && m.noShowCount === 0) return false;
      if (!q) return true;
      return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    });
  }, [members, search, flaggedOnly]);

  async function patchMember(id: string, body: object, okText: string) {
    setFeedback(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ tone: "error", text: data.error || "Could not update member." });
        return;
      }
      setFeedback({ tone: "success", text: okText });
      router.refresh();
    } catch {
      setFeedback({ tone: "error", text: "Network error." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {feedback ? (
        <AlertBanner tone={feedback.tone === "error" ? "error" : "success"} title={feedback.text} />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white p-4">
        <input
          type="search"
          aria-label="Search members"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email..."
          className="min-w-[240px] flex-1 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(e) => setFlaggedOnly(e.target.checked)}
            className="h-4 w-4 accent-[var(--stadium-blue)]"
          />
          Flagged / No-Show only
        </label>
      </div>

      <div className="space-y-3">
        {visible.map((m) => {
          const isSelf = m.id === currentUserId;
          return (
            <Card key={m.id} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-[var(--navy-900)]">{m.name}</h2>
                    <Badge tone="navy">{m.role}</Badge>
                    <StatusPill status={m.membershipStatus} />
                    {m.blocked ? <Badge tone="red">BLOCKED</Badge> : null}
                    {m.flaggedForReview ? <Badge tone="amber">FLAGGED NO-SHOW</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {m.email}
                    {m.phone ? ` · ${m.phone}` : ""} · No-shows: {m.noShowCount}
                    {m.expiresAt ? ` · Expires ${formatWhen(m.expiresAt)}` : ""}
                  </p>
                </div>

                {!isSelf ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label={`Role for ${m.name}`}
                      disabled={busyId === m.id}
                      value={m.role}
                      onChange={(e) => patchMember(m.id, { role: e.target.value }, `Role updated for ${m.name}.`)}
                      className="rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs font-semibold"
                    >
                      <option value="MEMBER">MEMBER</option>
                      <option value="STAFF">STAFF</option>
                      {canAssignAdminRoles ? <option value="ADMINISTRATOR">ADMINISTRATOR</option> : null}
                      {canAssignAdminRoles ? (
                        <option value="SUPER_ADMINISTRATOR">SUPER_ADMINISTRATOR</option>
                      ) : null}
                    </select>

                    <button
                      type="button"
                      disabled={busyId === m.id}
                      onClick={() =>
                        patchMember(
                          m.id,
                          { extendDays: 30, membershipStatus: "ACTIVE" },
                          `Extended ${m.name}'s membership by 30 days.`,
                        )
                      }
                      className="min-h-[34px] rounded-lg bg-[var(--stadium-blue)] px-3 text-xs font-semibold text-white hover:bg-[var(--stadium-blue-hover)]"
                    >
                      +30d Active
                    </button>

                    <button
                      type="button"
                      disabled={busyId === m.id}
                      onClick={() =>
                        patchMember(
                          m.id,
                          { membershipStatus: m.membershipStatus === "SUSPENDED" ? "ACTIVE" : "SUSPENDED" },
                          `Updated membership status for ${m.name}.`,
                        )
                      }
                      className="min-h-[34px] rounded-lg border border-[var(--border)] bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {m.membershipStatus === "SUSPENDED" ? "Unsuspend" : "Suspend"}
                    </button>

                    {m.flaggedForReview ? (
                      <button
                        type="button"
                        disabled={busyId === m.id}
                        onClick={() =>
                          patchMember(m.id, { clearFlag: true }, `Cleared no-show flag for ${m.name}.`)
                        }
                        className="min-h-[34px] rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-900"
                      >
                        Clear Flag
                      </button>
                    ) : null}

                    <button
                      type="button"
                      disabled={busyId === m.id}
                      onClick={() =>
                        patchMember(
                          m.id,
                          { blocked: !m.blocked },
                          `${m.blocked ? "Unblocked" : "Blocked"} ${m.name}.`,
                        )
                      }
                      className="min-h-[34px] rounded-lg border border-rose-300 bg-rose-50 px-3 text-xs font-semibold text-rose-800"
                    >
                      {m.blocked ? "Unblock" : "Block"}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-medium text-slate-400">Your Account</span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
