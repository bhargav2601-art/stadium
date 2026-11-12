import { NextResponse } from "next/server";
import { z } from "zod";
import { dateFromIso } from "@/domain/time";
import { prisma } from "@/lib/db";
import { createGame } from "@/server/games";
import { assertSameOrigin, jsonError, requireUser } from "@/server/guards";

const createGameSchema = z.object({
  sport: z.enum(["BADMINTON", "TABLE_TENNIS"]),
  gameType: z.enum(["SINGLES", "DOUBLES"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date format."),
  period: z.enum(["MORNING", "EVENING"]),
  startTime: z.string().trim().max(5).nullable().optional(),
  skillLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).nullable().optional(),
  playStyle: z.enum(["CASUAL", "COMPETITIVE"]).nullable().optional(),
  maxPlayers: z.number().int().min(2).max(4),
  joinMode: z.enum(["OPEN", "APPROVAL"]),
  description: z.string().trim().max(400).nullable().optional(),
});

export async function GET(request: Request) {
  try {
    await requireUser();
    const url = new URL(request.url);
    const sport = url.searchParams.get("sport");
    const status = url.searchParams.get("status");
    const date = url.searchParams.get("date");

    const games = await prisma.game.findMany({
      where: {
        ...(sport ? { sport: sport as never } : {}),
        ...(status ? { status: status as never } : {}),
        ...(date ? { date: dateFromIso(date) } : {}),
      },
      include: {
        organizer: { select: { id: true, name: true, avatarUrl: true } },
        participants: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
        waitlist: {
          where: { status: { in: ["WAITING", "OFFERED"] } },
          orderBy: { position: "asc" },
        },
      },
      orderBy: [{ date: "asc" }, { period: "asc" }, { createdAt: "desc" }],
      take: 60,
    });

    return NextResponse.json({ games });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = createGameSchema.parse(await request.json());
    const game = await createGame(user.id, body);
    return NextResponse.json({ game }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
