import { NextResponse } from "next/server";
import { createOnlinePaymentOrder } from "@/server/payments";
import { assertSameOrigin, jsonError, requireUser } from "@/server/guards";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const order = await createOnlinePaymentOrder(user.id);
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
