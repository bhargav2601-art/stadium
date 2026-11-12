"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AlertBanner, Badge, Card, StatusPill } from "@/components/ui/primitives";

type FacilityRow = {
  id: string;
  kind: string;
  name: string;
  closed: boolean;
  closedReason: string | null;
  crowdLevel: string | null;
};

type StaffOption = { id: string; name: string; role: string };
type AssignmentRow = { id: string; userId: string; facilityId: string; userName: string; facilityName: string };

export function FacilitiesAdminClient({
  facilities,
  staffUsers,
  assignments,
}: {
  facilities: FacilityRow[];
  staffUsers: StaffOption[];
  assignments: AssignmentRow[];
}) {
  const router = useRouter();
  const [reasons, setReasons] = useState<Record<string, string>>(
    Object.fromEntries(facilities.map((f) => [f.kind, f.closedReason ?? ""])),
  );
  const [crowds, setCrowds] = useState<Record<string, string>>(
    Object.fromEntries(facilities.map((f) => [f.kind, f.crowdLevel ?? ""])),
  );
  const [assignUserId, setAssignUserId] = useState(staffUsers[0]?.id ?? "");
  const [assignFacilityId, setAssignFacilityId] = useState(facilities[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function saveFacility(kind: string, closed: boolean) {
    setFeedback(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/facilities/${kind}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closed,
          closedReason: reasons[kind]?.trim() || null,
          crowdLevel: crowds[kind]?.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ tone: "error", text: data.error || "Could not update facility." });
        return;
      }
      setFeedback({ tone: "success", text: `Updated ${kind.replace("_", " ")} settings.` });
      router.refresh();
    } catch {
      setFeedback({ tone: "error", text: "Network error." });
    } finally {
      setBusy(false);
    }
  }

  async function updateAssignment(event: FormEvent) {
    event.preventDefault();
    if (!assignUserId || !assignFacilityId) return;
    setFeedback(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/staff-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: assignUserId, facilityId: assignFacilityId, action: "ASSIGN" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ tone: "error", text: data.error || "Assignment failed." });
        return;
      }
      setFeedback({ tone: "success", text: "Staff facility assignment saved." });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function removeAssignment(userId: string, facilityId: string) {
    setFeedback(null);
    setBusy(true);
    try {
      await fetch("/api/admin/staff-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, facilityId, action: "REMOVE" }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {feedback ? (
        <AlertBanner tone={feedback.tone === "error" ? "error" : "success"} title={feedback.text} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {facilities.map((f) => (
          <Card key={f.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge tone="navy">{f.kind}</Badge>
                <h2 className="text-base font-bold text-[var(--navy-900)]">{f.name}</h2>
              </div>
              <StatusPill status={f.closed ? "MAINTENANCE" : "ACTIVE"} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Crowd / Floor Note</label>
                <input
                  type="text"
                  value={crowds[f.kind] ?? ""}
                  onChange={(e) => setCrowds((prev) => ({ ...prev, [f.kind]: e.target.value }))}
                  placeholder="Light / Moderate / Peak"
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Closure Reason</label>
                <input
                  type="text"
                  value={reasons[f.kind] ?? ""}
                  onChange={(e) => setReasons((prev) => ({ ...prev, [f.kind]: e.target.value }))}
                  placeholder="Optional maintenance or event notice"
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => saveFacility(f.kind, false)}
                className="min-h-[38px] rounded-lg bg-[var(--stadium-blue)] px-3.5 text-xs font-semibold text-white hover:bg-[var(--stadium-blue-hover)]"
              >
                {f.closed ? "Reopen & Save" : "Save Details"}
              </button>
              {!f.closed ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => saveFacility(f.kind, true)}
                  className="min-h-[38px] rounded-lg border border-rose-300 bg-rose-50 px-3.5 text-xs font-semibold text-rose-800 hover:bg-rose-100"
                >
                  Close Facility & Notify Members
                </button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      <Card className="space-y-4">
        <h2 className="text-lg font-bold text-[var(--navy-900)]">Staff Facility Assignments</h2>
        <form onSubmit={updateAssignment} className="grid gap-3 md:grid-cols-3">
          <select
            aria-label="Staff member"
            value={assignUserId}
            onChange={(e) => setAssignUserId(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
          >
            {staffUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
          <select
            aria-label="Assigned facility"
            value={assignFacilityId}
            onChange={(e) => setAssignFacilityId(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
          >
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy}
            className="min-h-[40px] rounded-xl bg-[var(--navy-900)] px-4 text-xs font-semibold text-white hover:bg-[var(--stadium-blue)]"
          >
            Assign Staff
          </button>
        </form>

        <div className="space-y-2">
          {assignments.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2 text-xs"
            >
              <span>
                <span className="font-semibold text-[var(--navy-900)]">{a.userName}</span> → {a.facilityName}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => removeAssignment(a.userId, a.facilityId)}
                className="font-semibold text-rose-700 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
