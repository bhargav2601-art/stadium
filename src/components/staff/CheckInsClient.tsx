"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertBanner, Card, StatusPill } from "@/components/ui/primitives";
import { formatWhen } from "@/lib/format";

type MemberOption = {
  id: string;
  name: string;
  email: string;
  membershipStatus: string;
  blocked: boolean;
};

type CourtOption = {
  id: string;
  code: string;
  name: string;
  facilityKind: string;
};

type CheckInRow = {
  id: string;
  facilityName: string;
  facilityKind: string;
  courtId: string | null;
  checkedInAt: string;
  checkedOutAt: string | null;
  user: { id: string; name: string; email: string };
  verifiedBy: { name: string };
};

export function CheckInsClient({
  members,
  courts,
  checkIns,
}: {
  members: MemberOption[];
  courts: CourtOption[];
  checkIns: CheckInRow[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [facilityKind, setFacilityKind] = useState<
    "BADMINTON" | "GYM" | "TABLE_TENNIS" | "YOGA" | "BASKETBALL"
  >("BADMINTON");
  const [courtId, setCourtId] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [members, search]);

  const matchingCourts = courts.filter((c) => c.facilityKind === facilityKind);

  async function submitCheckIn(
    targetMemberId: string,
    kind: typeof facilityKind,
    action: "IN" | "OUT",
    selectedCourtId?: string | null,
  ) {
    setFeedback(null);
    setBusy(true);
    try {
      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: targetMemberId,
          facilityKind: kind,
          courtId: selectedCourtId || null,
          action,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ tone: "error", text: data.error || "Check-in update failed." });
        return;
      }
      setFeedback({
        tone: "success",
        text: action === "IN" ? "Member checked in successfully." : "Member checked out.",
      });
      router.refresh();
    } catch {
      setFeedback({ tone: "error", text: "Network error." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {feedback ? (
        <AlertBanner tone={feedback.tone === "error" ? "error" : "success"} title={feedback.text} />
      ) : null}

      <Card className="space-y-4">
        <h2 className="text-lg font-bold text-[var(--navy-900)]">Verify Member & Check In</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label htmlFor="member-search" className="block text-xs font-semibold text-slate-700">
              Filter Members
            </label>
            <input
              id="member-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or email..."
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="checkin-member" className="block text-xs font-semibold text-slate-700">
              Select Member
            </label>
            <select
              id="checkin-member"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
            >
              {filteredMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.email}) — {m.membershipStatus}
                  {m.blocked ? " [BLOCKED]" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="checkin-facility" className="block text-xs font-semibold text-slate-700">
              Facility
            </label>
            <select
              id="checkin-facility"
              value={facilityKind}
              onChange={(e) => {
                setFacilityKind(e.target.value as typeof facilityKind);
                setCourtId("");
              }}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
            >
              <option value="BADMINTON">Badminton</option>
              <option value="GYM">Gym</option>
              <option value="TABLE_TENNIS">Table Tennis</option>
              <option value="YOGA">Morning Yoga</option>
              <option value="BASKETBALL">Basketball Shared Floor</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-[220px]">
            <label htmlFor="checkin-court" className="block text-xs font-semibold text-slate-700">
              Court / Table (Optional FCFS assignment)
            </label>
            <select
              id="checkin-court"
              value={courtId}
              onChange={(e) => setCourtId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
            >
              <option value="">General Facility Entry</option>
              {matchingCourts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={busy || !memberId}
            onClick={() => submitCheckIn(memberId, facilityKind, "IN", courtId)}
            className="min-h-[42px] rounded-xl bg-[var(--stadium-blue)] px-5 text-sm font-semibold text-white hover:bg-[var(--stadium-blue-hover)] disabled:opacity-50"
          >
            Record Check-In
          </button>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-[var(--navy-900)]">Recent Check-Ins</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs uppercase text-slate-500">
                <th className="py-2 pr-3">Member</th>
                <th className="py-2 pr-3">Facility</th>
                <th className="py-2 pr-3">Checked In</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Verified By</th>
                <th className="py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {checkIns.map((row) => (
                <tr key={row.id}>
                  <td className="py-3 pr-3 font-semibold text-[var(--navy-900)]">{row.user.name}</td>
                  <td className="py-3 pr-3 text-slate-700">{row.facilityName}</td>
                  <td className="py-3 pr-3 text-xs text-slate-600">{formatWhen(row.checkedInAt)}</td>
                  <td className="py-3 pr-3">
                    <StatusPill status={row.checkedOutAt ? "COMPLETED" : "ACTIVE"} />
                  </td>
                  <td className="py-3 pr-3 text-xs text-slate-600">{row.verifiedBy.name}</td>
                  <td className="py-3 text-right">
                    {!row.checkedOutAt ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          submitCheckIn(
                            row.user.id,
                            row.facilityKind as typeof facilityKind,
                            "OUT",
                            row.courtId,
                          )
                        }
                        className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--navy-900)] hover:bg-slate-100"
                      >
                        Check Out
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Closed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
