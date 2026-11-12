import { NextResponse } from "next/server";
import { joinGame } from "@/server/games";
import { assertSameOrigin, jsonError, requireUser } from "@/server/guards";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const result = await joinGame(user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
