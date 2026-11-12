"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertBanner, Badge, Card, StatusPill } from "@/components/ui/primitives";
import { formatInr, formatWhen } from "@/lib/format";

type PaymentRow = {
  id: string;
  receiptNumber: string | null;
  purpose: string;
  method: string;
  provider: string;
  amountPaise: number;
  status: string;
  offlineReference: string | null;
  createdAt: string;
  verifiedAt: string | null;
  user: { name: string; email: string };
};

export function PaymentsAdminClient({ payments }: { payments: PaymentRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function decide(paymentId: string, decision: "APPROVE" | "REJECT") {
    setFeedback(null);
    setBusyId(paymentId);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          reason: reasons[paymentId]?.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ tone: "error", text: data.error || "Could not process verification." });
        return;
      }
      setFeedback({
        tone: "success",
        text:
          decision === "APPROVE"
            ? "Offline payment approved and membership updated."
            : "Offline payment rejected.",
      });
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

      <div className="space-y-3">
        {payments.map((p) => (
          <Card key={p.id} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold text-[var(--navy-900)]">{p.user.name}</span>
                  <Badge tone="navy">{p.purpose.replace("_", " ")}</Badge>
                  <Badge tone="slate">
                    {p.method} · {p.provider}
                  </Badge>
                  <StatusPill status={p.status} />
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {p.user.email} · {formatInr(p.amountPaise)} · Created {formatWhen(p.createdAt)}
                  {p.receiptNumber ? ` · Receipt: ${p.receiptNumber}` : ""}
                </p>
                {p.offlineReference ? (
                  <p className="mt-1 text-xs font-semibold text-[var(--navy-900)]">
                    Desk Reference: {p.offlineReference}
                  </p>
                ) : null}
              </div>

              {p.status === "PENDING_VERIFICATION" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Rejection note (optional)"
                    value={reasons[p.id] ?? ""}
                    onChange={(e) => setReasons((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    className="rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => decide(p.id, "APPROVE")}
                    className="min-h-[36px] rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Approve & Activate
                  </button>
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => decide(p.id, "REJECT")}
                    className="min-h-[36px] rounded-lg border border-rose-300 bg-rose-50 px-3 text-xs font-semibold text-rose-800 hover:bg-rose-100"
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
