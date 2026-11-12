import { NextResponse } from "next/server";
import { z } from "zod";
import { reviewJoinRequest } from "@/server/games";
import { assertSameOrigin, jsonError, requireUser } from "@/server/guards";

const decisionSchema = z.object({
  decision: z.enum(["APPROVE", "DECLINE"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; participantId: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id, participantId } = await context.params;
    const body = decisionSchema.parse(await request.json());
    const result = await reviewJoinRequest(user.id, user.role, id, participantId, body.decision);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
