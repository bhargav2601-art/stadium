import { NextResponse } from "next/server";
import { z } from "zod";
import { changePassword, startSession } from "@/server/auth";
import { assertSameOrigin, jsonError, requireUser } from "@/server/guards";
import { setSessionCookie } from "@/server/session-cookie";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password.").max(128),
  newPassword: z.string().min(8, "Use a new password of at least 8 characters.").max(128),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = changePasswordSchema.parse(await request.json());
    await changePassword(user.id, body.currentPassword, body.newPassword);
    const session = await startSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
