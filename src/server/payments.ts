import { randomBytes } from "node:crypto";
import { can } from "@/domain/permissions";
import { signOrderPayment, verifyOrderSignature, verifyWebhookSignature } from "@/domain/payments";
import { cleanText } from "@/domain/text";
import { prisma } from "@/lib/db";
import { AppError, ForbiddenError } from "@/server/errors";
import { activateMembership, purposeFor } from "@/server/membership";
import { notifyAdmins, notifyUsers } from "@/server/notifications";
import { getSettings } from "@/server/settings";
import type { Role } from "../../generated/prisma/client";

export function isRazorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim());
}

function getSandboxSecret() {
  const secret = process.env.SANDBOX_PAYMENT_SECRET?.trim();
  if (!secret) throw new AppError("Sandbox payment secret is not configured on the server.", 500);
  return secret;
}

function makeReceiptNumber() {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `AKS-${day}-${suffix}`;
}

export async function createOnlinePaymentOrder(userId: string) {
  const membership = await prisma.membership.findUnique({ where: { userId } });
  if (!membership) throw new AppError("Membership record not found.", 404);
  if (membership.status === "SUSPENDED") {
    throw new AppError("This membership is suspended. Contact an administrator before renewing.");
  }

  const purpose = purposeFor(membership.startedAt);
  const planCode = purpose === "INITIAL" ? "INITIAL" : "MONTHLY_RENEWAL";
  const [plan, settings] = await Promise.all([
    prisma.membershipPlan.findUnique({ where: { code: planCode } }),
    getSettings(),
  ]);

  const amountPaise =
    plan?.amountPaise ??
    Number(purpose === "INITIAL" ? settings["membership.initial_paise"] : settings["membership.monthly_paise"]);

  if (isRazorpayConfigured()) {
    const keyId = process.env.RAZORPAY_KEY_ID!.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET!.trim();
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: `aks_${userId.slice(-8)}_${Date.now()}`,
        notes: { userId, membershipId: membership.id, purpose },
      }),
    });

    if (!response.ok) {
      throw new AppError("Could not initialize Razorpay order. Check Razorpay test credentials.", 502);
    }
    const order = (await response.json()) as { id: string; amount: number; currency: string };
    const payment = await prisma.payment.create({
      data: {
        userId,
        membershipId: membership.id,
        purpose,
        method: "ONLINE",
        amountPaise: order.amount,
        currency: order.currency,
        status: "CREATED",
        provider: "razorpay",
        providerOrderId: order.id,
      },
    });

    return {
      mode: "razorpay" as const,
      keyId,
      orderId: order.id,
      amountPaise: order.amount,
      currency: order.currency,
      purpose,
      paymentId: payment.id,
    };
  }

  const sandboxOrderId = `sbx_ord_${randomBytes(8).toString("hex")}`;
  const sandboxPaymentId = `sbx_pay_${randomBytes(8).toString("hex")}`;
  const sandboxSignature = signOrderPayment(sandboxOrderId, sandboxPaymentId, getSandboxSecret());

  const payment = await prisma.payment.create({
    data: {
      userId,
      membershipId: membership.id,
      purpose,
      method: "ONLINE",
      amountPaise,
      currency: "INR",
      status: "CREATED",
      provider: "sandbox",
      providerOrderId: sandboxOrderId,
    },
  });

  return {
    mode: "sandbox" as const,
    orderId: sandboxOrderId,
    suggestedPaymentId: sandboxPaymentId,
    signature: sandboxSignature,
    amountPaise,
    currency: "INR",
    purpose,
    paymentId: payment.id,
  };
}

export async function verifyOnlinePayment(
  userId: string,
  input: { orderId: string; paymentId: string; signature: string },
) {
  const existing = await prisma.payment.findUnique({ where: { providerOrderId: input.orderId } });
  if (!existing || existing.userId !== userId) {
    throw new AppError("Payment order not found.", 404);
  }

  const secret =
    existing.provider === "razorpay"
      ? process.env.RAZORPAY_KEY_SECRET?.trim() || ""
      : getSandboxSecret();

  if (!secret) throw new AppError("Payment verification secret is missing.", 500);
  const valid = verifyOrderSignature({
    orderId: input.orderId,
    paymentId: input.paymentId,
    signature: input.signature,
    secret,
  });
  if (!valid) {
    await prisma.payment.update({
      where: { id: existing.id },
      data: { status: "FAILED", failureReason: "Invalid payment signature." },
    });
    throw new AppError("Payment signature verification failed.", 400);
  }

  return finalizePaidPayment(existing.id, input.paymentId);
}

async function finalizePaidPayment(paymentId: string, providerPaymentId?: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM payments WHERE id = ${paymentId} FOR UPDATE`;
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    if (payment.status === "PAID") {
      const membership = await tx.membership.findUnique({ where: { id: payment.membershipId } });
      return { payment, membership, idempotent: true };
    }

    const settings = await getSettings(tx);
    const periodDays = Number(settings["membership.period_days"]);
    const receiptNumber = payment.receiptNumber ?? makeReceiptNumber();

    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        providerPaymentId: providerPaymentId ?? payment.providerPaymentId,
        receiptNumber,
        verifiedAt: new Date(),
      },
    });

    const membership = await activateMembership({
      tx,
      membershipId: payment.membershipId,
      periodDays,
    });

    await notifyUsers(
      [payment.userId],
      {
        type: "PAYMENT_CONFIRMATION",
        title: "Membership payment confirmed",
        body: `Receipt ${receiptNumber} issued. Your membership is now ${membership.status.toLowerCase().replace("_", " ")}.`,
        href: `/portal/receipts/${payment.id}`,
      },
      tx,
    );

    return { payment: updatedPayment, membership, idempotent: false };
  });
}

export async function submitOfflinePayment(userId: string, reference: string) {
  const cleanRef = cleanText(reference, 120);
  if (cleanRef.length < 3) throw new AppError("Enter the UPI / desk receipt reference number.");

  const membership = await prisma.membership.findUnique({ where: { userId } });
  if (!membership) throw new AppError("Membership record not found.", 404);
  if (membership.status === "SUSPENDED") {
    throw new AppError("This membership is suspended. Contact an administrator first.");
  }

  const purpose = purposeFor(membership.startedAt);
  const settings = await getSettings();
  const amountPaise = Number(
    purpose === "INITIAL" ? settings["membership.initial_paise"] : settings["membership.monthly_paise"],
  );

  const payment = await prisma.payment.create({
    data: {
      userId,
      membershipId: membership.id,
      purpose,
      method: "OFFLINE",
      amountPaise,
      currency: "INR",
      status: "PENDING_VERIFICATION",
      provider: "offline",
      offlineReference: cleanRef,
    },
  });

  await notifyAdmins({
    type: "PAYMENT_VERIFICATION",
    title: "Offline payment pending verification",
    body: `A member submitted offline reference "${cleanRef}" for verification.`,
    href: "/admin/payments",
  });

  return payment;
}

export async function verifyOfflinePayment(
  adminId: string,
  adminRole: Role,
  paymentId: string,
  decision: "APPROVE" | "REJECT",
  reason?: string,
) {
  if (!can(adminRole, "payments.verify")) {
    throw new ForbiddenError("Only administrators can verify offline payments.");
  }

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM payments WHERE id = ${paymentId} FOR UPDATE`;
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new AppError("Payment not found.", 404);
    if (payment.status !== "PENDING_VERIFICATION") {
      throw new AppError("This payment is no longer awaiting verification.");
    }

    if (decision === "REJECT") {
      const cleanReason = reason ? cleanText(reason, 200) : "Offline reference could not be verified.";
      const rejected = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: "REJECTED",
          verifiedById: adminId,
          verifiedAt: new Date(),
          failureReason: cleanReason,
        },
      });
      await tx.adminAuditLog.create({
        data: {
          actorId: adminId,
          action: "payment.reject",
          entity: "Payment",
          entityId: paymentId,
          metadata: { reason: cleanReason },
        },
      });
      await notifyUsers(
        [payment.userId],
        {
          type: "PAYMENT_CONFIRMATION",
          title: "Offline payment rejected",
          body: cleanReason,
          href: "/portal/membership",
        },
        tx,
      );
      return { payment: rejected, membership: null };
    }

    const settings = await getSettings(tx);
    const periodDays = Number(settings["membership.period_days"]);
    const receiptNumber = makeReceiptNumber();

    const approved = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: "PAID",
        verifiedById: adminId,
        verifiedAt: new Date(),
        receiptNumber,
      },
    });
    const membership = await activateMembership({
      tx,
      membershipId: payment.membershipId,
      periodDays,
    });
    await tx.adminAuditLog.create({
      data: {
        actorId: adminId,
        action: "payment.approve",
        entity: "Payment",
        entityId: paymentId,
        metadata: { receiptNumber, amountPaise: payment.amountPaise },
      },
    });
    await notifyUsers(
      [payment.userId],
      {
        type: "PAYMENT_CONFIRMATION",
        title: "Offline payment approved",
        body: `Receipt ${receiptNumber} issued and membership activated.`,
        href: `/portal/receipts/${payment.id}`,
      },
      tx,
    );
    return { payment: approved, membership };
  });
}

export async function processPaymentWebhook(input: {
  rawBody: string;
  signature: string;
  provider: "razorpay" | "sandbox";
  eventIdHeader?: string | null;
}) {
  const secret =
    input.provider === "razorpay"
      ? process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || ""
      : getSandboxSecret();
  if (!secret) throw new AppError("Webhook secret is not configured.", 500);

  if (!verifyWebhookSignature(input.rawBody, input.signature, secret)) {
    throw new AppError("Invalid webhook signature.", 401);
  }

  const parsed = JSON.parse(input.rawBody) as {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
    orderId?: string;
    paymentId?: string;
  };

  const orderId = parsed.payload?.payment?.entity?.order_id ?? parsed.orderId;
  const providerPaymentId = parsed.payload?.payment?.entity?.id ?? parsed.paymentId;
  const providerEventId =
    input.eventIdHeader?.trim() || `${parsed.event ?? "payment"}:${orderId ?? "unknown"}:${providerPaymentId ?? "none"}`;

  const existingEvent = await prisma.paymentWebhookEvent.findUnique({
    where: { provider_providerEventId: { provider: input.provider, providerEventId } },
  });
  if (existingEvent) {
    return { ok: true, idempotent: true };
  }

  const payloadHash = cleanText(input.signature, 128);
  await prisma.paymentWebhookEvent.create({
    data: {
      provider: input.provider,
      providerEventId,
      payloadHash,
      status: "PROCESSED",
      processedAt: new Date(),
    },
  });

  if (orderId) {
    const payment = await prisma.payment.findUnique({ where: { providerOrderId: orderId } });
    if (payment) {
      await finalizePaidPayment(payment.id, providerPaymentId);
    }
  }

  return { ok: true, idempotent: false };
}
