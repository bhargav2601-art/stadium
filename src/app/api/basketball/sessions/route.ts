import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { scheduleBasketballSession, toggleBasketballSessionState } from "@/server/facilities";
import { assertSameOrigin, jsonError, requireUser } from "@/server/guards";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  notes: z.string().trim().max(400).nullable().optional(),
  publish: z.boolean().default(false),
});

const patchSchema = z.object({
  sessionId: z.string().min(1),
  action: z.enum(["PUBLISH", "END"]),
});

export async function GET() {
  try {
    const sessions = await prisma.basketballSession.findMany({
      orderBy: { startsAt: "desc" },
      take: 20,
    });
    return NextResponse.json({ sessions });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = createSchema.parse(await request.json());
    const session = await scheduleBasketballSession(user.id, user.role, {
      startsAt: new Date(body.startsAt),
      endsAt: new Date(body.endsAt),
      notes: body.notes ?? null,
      publish: body.publish,
    });
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = patchSchema.parse(await request.json());
    const session = await toggleBasketballSessionState(user.id, user.role, body.sessionId, body.action);
    return NextResponse.json({ session });
  } catch (error) {
    return jsonError(error);
  }
}
