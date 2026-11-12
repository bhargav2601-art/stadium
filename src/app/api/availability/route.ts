import { NextResponse } from "next/server";
import { z } from "zod";
import { cleanText } from "@/domain/text";
import { dateFromIso, isSlotInPast } from "@/domain/time";
import { prisma } from "@/lib/db";
import { AppError } from "@/server/errors";
import { assertSameOrigin, jsonError, requireActiveMember, requireUser } from "@/server/guards";

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period: z.enum(["MORNING", "EVENING"]),
  sport: z.enum(["BADMINTON", "TABLE_TENNIS"]),
  note: z.string().trim().max(200).optional(),
});

const deleteSchema = z.object({
  id: z.string().min(1),
});

export async function GET() {
  try {
    const user = await requireUser();
    const slots = await prisma.playerAvailability.findMany({
      where: { userId: user.id },
      orderBy: [{ date: "asc" }, { period: "asc" }],
    });
    return NextResponse.json({ slots });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { user } = await requireActiveMember();
    const body = createSchema.parse(await request.json());
    if (isSlotInPast({ date: body.date, period: body.period })) {
      throw new AppError("Cannot post availability for a past session.");
    }

    const slot = await prisma.playerAvailability.upsert({
      where: {
        userId_date_period_sport: {
          userId: user.id,
          date: dateFromIso(body.date),
          period: body.period,
          sport: body.sport,
        },
      },
      update: { note: body.note ? cleanText(body.note, 200) : null },
      create: {
        userId: user.id,
        date: dateFromIso(body.date),
        period: body.period,
        sport: body.sport,
        note: body.note ? cleanText(body.note, 200) : null,
      },
    });
    return NextResponse.json({ slot }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = deleteSchema.parse(await request.json());
    await prisma.playerAvailability.deleteMany({
      where: { id: body.id, userId: user.id },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
