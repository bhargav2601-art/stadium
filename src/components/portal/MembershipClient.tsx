"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AlertBanner, Card, StatusPill } from "@/components/ui/primitives";
import { formatInr, formatWhen } from "@/lib/format";

type PaymentItem = {
  id: string;
  purpose: string;
  method: string;
  amountPaise: number;
  status: string;
  provider: string;
  offlineReference: string | null;
  receiptNumber: string | null;
  createdAt: string;
};

type SandboxOrder = {
  mode: "sandbox";
  orderId: string;
  suggestedPaymentId: string;
  signature: string;
  amountPaise: number;
  purpose: string;
};

export function MembershipClient({
  membershipStatus,
  startedAt,
  expiresAt,
  nextAmountPaise,
  nextPurpose,
  razorpayEnabled,
  payments,
  userEmail,
  userName,
}: {
  membershipStatus: string;
  startedAt: string | null;
  expiresAt: string | null;
  nextAmountPaise: number;
  nextPurpose: "INITIAL" | "RENEWAL";
  razorpayEnabled: boolean;
  payments: PaymentItem[];
  userEmail: string;
  userName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [sandboxOrder, setSandboxOrder] = useState<SandboxOrder | null>(null);
  const [offlineRef, setOfflineRef] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  async function startOnlinePayment() {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/payments/orders", { method: "POST" });
      const data = (await res.json()) as
        | SandboxOrder
        | { mode: "razorpay"; keyId: string; orderId: string; amountPaise: number; currency: string; error?: string };

      if (!res.ok) {
        setFeedback({ tone: "error", text: ("error" in data && data.error) || "Could not create order." });
        return;
      }

      if (data.mode === "sandbox") {
        setSandboxOrder(data);
        setFeedback({
          tone: "info",
          text: "Razorpay test keys are not set in .env, so the signed server sandbox checkout is ready below.",
        });
        return;
      }

      // Dynamically load Razorpay Checkout script when Razorpay test credentials are configured
      const loaded = await new Promise<boolean>((resolve) => {
        if ("Razorpay" in window) return resolve(true);
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });

      if (!loaded) {
        setFeedback({ tone: "error", text: "Unable to load Razorpay Checkout script." });
        return;
      }

      type RazorpayInstance = { open: () => void };
      const RazorpayCtor = (window as unknown as { Razorpay: new (opts: Record<string, unknown>) => RazorpayInstance })
        .Razorpay;
      const rzp = new RazorpayCtor({
        key: data.keyId,
        amount: data.amountPaise,
        currency: data.currency,
        name: "Anil Kumble Stadium",
        description: `${nextPurpose === "INITIAL" ? "Initial" : "Monthly"} Stadium Membership`,
        order_id: data.orderId,
        prefill: { name: userName, email: userEmail },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            }),
          });
          const verifyJson = (await verifyRes.json()) as { error?: string };
          if (!verifyRes.ok) {
            setFeedback({ tone: "error", text: verifyJson.error || "Verification failed." });
            return;
          }
          setFeedback({ tone: "success", text: "Payment verified and membership activated!" });
          router.refresh();
        },
      });
      rzp.open();
    } finally {
      setBusy(false);
    }
  }

  async function confirmSandboxPayment() {
    if (!sandboxOrder) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: sandboxOrder.orderId,
          paymentId: sandboxOrder.suggestedPaymentId,
          signature: sandboxOrder.signature,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ tone: "error", text: data.error || "Sandbox verification failed." });
        return;
      }
      setSandboxOrder(null);
      setFeedback({ tone: "success", text: "Sandbox payment verified on server and membership activated!" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function submitOffline(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/payments/offline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: offlineRef }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ tone: "error", text: data.error || "Could not submit offline reference." });
        return;
      }
      setOfflineRef("");
      setFeedback({
        tone: "success",
        text: "Offline payment reference submitted for administrator verification.",
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {feedback ? <AlertBanner tone={feedback.tone} title={feedback.text} /> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[var(--navy-900)]">Current Membership</h2>
            <StatusPill status={membershipStatus} />
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs uppercase text-slate-500">Started</dt>
              <dd className="font-semibold text-[var(--navy-900)]">
                {startedAt ? formatWhen(startedAt) : "Not activated yet"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">Expires</dt>
              <dd className="font-semibold text-[var(--navy-900)]">
                {expiresAt ? formatWhen(expiresAt) : "Pending first payment"}
              </dd>
            </div>
          </dl>

          <div className="rounded-xl border border-[var(--border)] bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
              {nextPurpose === "INITIAL" ? "Initial Activation Due" : "Next Monthly Renewal"}
            </p>
            <p className="mt-1 text-2xl font-bold text-[var(--navy-900)]">{formatInr(nextAmountPaise)}</p>
            <p className="mt-1 text-xs text-slate-600">
              Payment gateway: {razorpayEnabled ? "Razorpay Test Mode" : "Server-Signed Sandbox Mode"}
            </p>
            <button
              type="button"
              disabled={busy || membershipStatus === "SUSPENDED"}
              onClick={startOnlinePayment}
              className="mt-3 min-h-[44px] w-full rounded-xl bg-[var(--lime)] px-5 py-2.5 text-sm font-bold text-[var(--lime-ink)] hover:brightness-95 disabled:opacity-60"
            >
              {busy ? "Processing..." : `Pay ${formatInr(nextAmountPaise)} Online`}
            </button>
          </div>

          {sandboxOrder ? (
            <div className="rounded-xl border-2 border-blue-300 bg-blue-50 p-4 text-sm">
              <p className="font-bold text-blue-950">Signed Sandbox Checkout Ready</p>
              <p className="mt-1 text-xs text-blue-900">
                Order: <code>{sandboxOrder.orderId}</code> · Amount: {formatInr(sandboxOrder.amountPaise)}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={confirmSandboxPayment}
                className="mt-3 min-h-[42px] rounded-xl bg-[var(--stadium-blue)] px-4 py-2 text-xs font-bold text-white"
              >
                Complete & Verify Signed Sandbox Payment
              </button>
            </div>
          ) : null}
        </Card>

        <Card className="space-y-4">
          <h2 className="text-xl font-bold text-[var(--navy-900)]">Paid at Stadium Desk / Offline UPI?</h2>
          <p className="text-sm text-[var(--muted)]">
            Enter your receipt number or UPI transaction reference below. An administrator will verify it and extend
            your membership.
          </p>
          <form onSubmit={submitOffline} className="space-y-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="offline-ref" className="text-sm font-semibold">
                Desk receipt or UPI reference
              </label>
              <input
                id="offline-ref"
                required
                minLength={3}
                maxLength={120}
                value={offlineRef}
                onChange={(e) => setOfflineRef(e.target.value)}
                placeholder="e.g. UPI-432198765 or DESK-104"
              />
            </div>
            <button
              type="submit"
              disabled={busy || membershipStatus === "SUSPENDED"}
              className="min-h-[44px] rounded-xl bg-[var(--navy-900)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Submit for Admin Verification
            </button>
          </form>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-bold text-[var(--navy-900)]">Payment History</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="visually-hidden">Member payment history</caption>
            <thead>
              <tr className="border-b border-[var(--border)] text-xs uppercase text-slate-500">
                <th scope="col" className="py-2 pr-4">Date</th>
                <th scope="col" className="py-2 pr-4">Purpose</th>
                <th scope="col" className="py-2 pr-4">Method</th>
                <th scope="col" className="py-2 pr-4">Amount</th>
                <th scope="col" className="py-2 pr-4">Status</th>
                <th scope="col" className="py-2">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-slate-500">
                    No payments recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 pr-4">{formatWhen(p.createdAt)}</td>
                    <td className="py-3 pr-4 font-medium">{p.purpose}</td>
                    <td className="py-3 pr-4">{p.method}</td>
                    <td className="py-3 pr-4 font-semibold">{formatInr(p.amountPaise)}</td>
                    <td className="py-3 pr-4">
                      <StatusPill status={p.status} />
                    </td>
                    <td className="py-3">
                      {p.receiptNumber ? (
                        <Link
                          href={`/portal/receipts/${p.id}`}
                          className="font-semibold text-[var(--stadium-blue)] hover:underline"
                        >
                          {p.receiptNumber}
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
