import { NextResponse } from "next/server";
import { processPaymentWebhook } from "@/server/payments";
import { jsonError } from "@/server/guards";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const razorpaySig = request.headers.get("x-razorpay-signature");
    const sandboxSig = request.headers.get("x-sandbox-signature");
    const provider = razorpaySig ? "razorpay" : "sandbox";
    const signature = razorpaySig ?? sandboxSig ?? "";
    if (!signature) {
      return NextResponse.json({ error: "Missing webhook signature header." }, { status: 400 });
    }

    const result = await processPaymentWebhook({
      rawBody,
      signature,
      provider,
      eventIdHeader: request.headers.get("x-razorpay-event-id") ?? request.headers.get("x-event-id"),
    });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
