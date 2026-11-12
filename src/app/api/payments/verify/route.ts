import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyOnlinePayment } from "@/server/payments";
import { assertSameOrigin, jsonError, requireUser } from "@/server/guards";

const verifySchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = verifySchema.parse(await request.json());
    const result = await verifyOnlinePayment(user.id, body);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
