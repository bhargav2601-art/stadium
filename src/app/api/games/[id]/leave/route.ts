import { NextResponse } from "next/server";
import { z } from "zod";
import { leaveGame } from "@/server/games";
import { assertSameOrigin, jsonError, requireUser } from "@/server/guards";

const leaveSchema = z.object({
  needsReplacement: z.boolean().optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    let needsReplacement = false;
    try {
      const parsed = leaveSchema.parse(await request.json());
      needsReplacement = Boolean(parsed.needsReplacement);
    } catch {
      // allow empty POST body
    }
    const result = await leaveGame(user.id, id, needsReplacement);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
