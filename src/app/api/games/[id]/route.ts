import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { cancelGame, updateGameLifecycle } from "@/server/games";
import { assertSameOrigin, jsonError, requireUser } from "@/server/guards";

const lifecycleSchema = z.object({
  action: z.enum(["START", "COMPLETE", "INCOMPLETE", "OPEN_REPLACEMENT"]),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await context.params;
    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        organizer: { select: { id: true, name: true, avatarUrl: true } },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                playerProfile: { select: { skillLevel: true, playStyle: true } },
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        waitlist: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { position: "asc" },
        },
        attendance: true,
      },
    });
    if (!game) return NextResponse.json({ error: "Game not found." }, { status: 404 });
    return NextResponse.json({ game });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const body = lifecycleSchema.parse(await request.json());
    const game = await updateGameLifecycle(user.id, user.role, id, body.action);
    return NextResponse.json({ game });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const result = await cancelGame(user.id, user.role, id);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
