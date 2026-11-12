import { NextResponse } from "next/server";
import { endSession } from "@/server/auth";
import { assertSameOrigin, jsonError } from "@/server/guards";
import { clearSessionCookie, getSessionToken } from "@/server/session-cookie";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const token = await getSessionToken();
    await endSession(token);
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
