import { NextResponse } from "next/server";
import { z } from "zod";
import { respondToWaitlistOffer } from "@/server/games";
import { assertSameOrigin, jsonError, requireUser } from "@/server/guards";

const respondSchema = z.object({
  decision: z.enum(["ACCEPT", "DECLINE"]),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const body = respondSchema.parse(await request.json());
    const result = await respondToWaitlistOffer(user.id, id, body.decision);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
