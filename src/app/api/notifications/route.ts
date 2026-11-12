import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertSameOrigin, jsonError, requireUser } from "@/server/guards";

const markSchema = z.object({
  id: z.string().optional(),
  all: z.boolean().optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const [notifications, preference] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 60,
      }),
      prisma.notificationPreference.findUnique({ where: { userId: user.id } }),
    ]);
    const unreadCount = notifications.filter((n) => !n.readAt).length;
    return NextResponse.json({ notifications, preference, unreadCount });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = markSchema.parse(await request.json());
    if (body.all) {
      await prisma.notification.updateMany({
        where: { userId: user.id, readAt: null },
        data: { readAt: new Date() },
      });
    } else if (body.id) {
      await prisma.notification.updateMany({
        where: { id: body.id, userId: user.id },
        data: { readAt: new Date() },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
