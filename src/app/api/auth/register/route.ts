import { NextResponse } from "next/server";
import { z } from "zod";
import { registerAccount, startSession } from "@/server/auth";
import { AppError } from "@/server/errors";
import { assertSameOrigin, clientIpFromRequest, jsonError } from "@/server/guards";
import { rateLimit } from "@/server/rate-limit";
import { setSessionCookie } from "@/server/session-cookie";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name (at least 2 characters).").max(80),
  email: z.string().trim().email("Enter a valid email address.").max(160),
  password: z.string().min(8, "Use a password of at least 8 characters.").max(128),
  phone: z.string().trim().max(20).optional(),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const ip = clientIpFromRequest(request);
    const ipLimit = rateLimit(`register:ip:${ip}`, 20, 60 * 60 * 1000);
    if (!ipLimit.ok) {
      throw new AppError("Too many registration attempts from this network. Try again later.", 429);
    }

    const body = registerSchema.parse(await request.json());
    const user = await registerAccount(body);
    const session = await startSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          membershipStatus: "PENDING",
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
