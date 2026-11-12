import { NextResponse } from "next/server";
import { joinWaitlist } from "@/server/games";
import { assertSameOrigin, jsonError, requireUser } from "@/server/guards";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const entry = await joinWaitlist(user.id, id);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
