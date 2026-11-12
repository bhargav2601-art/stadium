import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createYogaSession } from "@/server/facilities";
import { assertSameOrigin, jsonError, requireUser } from "@/server/guards";

export const dynamic = "force-dynamic";

const createYogaSchema = z.object({
  title: z.string().trim().min(3).max(120),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  capacity: z.number().int().min(1).max(200).nullable().optional(),
  notes: z.string().trim().max(400).nullable().optional(),
});

export async function GET() {
  try {
    const sessions = await prisma.yogaSession.findMany({
      where: { cancelled: false },
      include: {
        registrations: { where: { cancelledAt: null }, select: { userId: true } },
      },
      orderBy: { startsAt: "asc" },
      take: 30,
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
    const body = createYogaSchema.parse(await request.json());
    const session = await createYogaSession(user.id, user.role, {
      title: body.title,
      startsAt: new Date(body.startsAt),
      endsAt: new Date(body.endsAt),
      capacity: body.capacity ?? null,
      notes: body.notes ?? null,
    });
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
