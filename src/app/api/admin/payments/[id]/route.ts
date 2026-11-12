import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyOfflinePayment } from "@/server/payments";
import { assertSameOrigin, jsonError, requireUser } from "@/server/guards";

const verifyOfflineSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().max(200).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireUser();
    const { id } = await context.params;
    const body = verifyOfflineSchema.parse(await request.json());
    const result = await verifyOfflinePayment(admin.id, admin.role, id, body.decision, body.reason);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
