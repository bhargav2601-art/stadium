import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireUser } from "@/server/guards";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const skillLevel = url.searchParams.get("skillLevel");
    const preferredGame = url.searchParams.get("preferredGame");
    const preferredTime = url.searchParams.get("preferredTime");
    const playStyle = url.searchParams.get("playStyle");
    const availableNow = url.searchParams.get("availableNow") === "true";
    const query = url.searchParams.get("q")?.trim();

    const blocks = await prisma.userBlock.findMany({
      where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] },
    });
    const blockedIds = blocks.map((b) => (b.blockerId === user.id ? b.blockedId : b.blockerId));

    const players = await prisma.user.findMany({
      where: {
        id: { notIn: [user.id, ...blockedIds] },
        blocked: false,
        membership: { status: { in: ["ACTIVE", "EXPIRING_SOON"] } },
        ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
        playerProfile: {
          is: {
            ...(skillLevel ? { skillLevel: skillLevel as never } : {}),
            ...(preferredGame ? { preferredGame: preferredGame as never } : {}),
            ...(preferredTime ? { preferredTime: preferredTime as never } : {}),
            ...(playStyle ? { playStyle: playStyle as never } : {}),
            ...(availableNow ? { availableNow: true } : {}),
          },
        },
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        playerProfile: true,
        availability: {
          where: { date: { gte: new Date(new Date().toISOString().slice(0, 10)) } },
          orderBy: { date: "asc" },
          take: 5,
        },
      },
      orderBy: [{ playerProfile: { availableNow: "desc" } }, { name: "asc" }],
      take: 60,
    });

    return NextResponse.json({ players });
  } catch (error) {
    return jsonError(error);
  }
}
