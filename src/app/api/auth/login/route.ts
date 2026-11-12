import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, startSession } from "@/server/auth";
import { AppError } from "@/server/errors";
import { assertSameOrigin, clientIpFromRequest, jsonError } from "@/server/guards";
import { syncMembership } from "@/server/membership";
import { rateLimit } from "@/server/rate-limit";
import { setSessionCookie } from "@/server/session-cookie";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(160),
  password: z.string().min(1, "Enter your password.").max(128),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const ip = clientIpFromRequest(request);
    const ipLimit = rateLimit(`login:ip:${ip}`, 40, 15 * 60 * 1000);
    if (!ipLimit.ok) {
      throw new AppError("Too many sign-in attempts. Try again in a few minutes.", 429);
    }

    const body = loginSchema.parse(await request.json());
    const user = await authenticate(body.email, body.password);
    const session = await startSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);
    const membership = await syncMembership(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        membershipStatus: membership?.status ?? "PENDING",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
