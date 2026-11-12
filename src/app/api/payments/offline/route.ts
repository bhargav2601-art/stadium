import { NextResponse } from "next/server";
import { z } from "zod";
import { submitOfflinePayment } from "@/server/payments";
import { assertSameOrigin, jsonError, requireUser } from "@/server/guards";

const offlineSchema = z.object({
  reference: z.string().trim().min(3, "Enter your UPI or front-desk reference.").max(120),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = offlineSchema.parse(await request.json());
    const payment = await submitOfflinePayment(user.id, body.reference);
    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
