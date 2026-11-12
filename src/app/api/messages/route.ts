import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertSameOrigin, jsonError, requireUser } from "@/server/guards";
import { sendDirectMessage } from "@/server/profile";

const sendSchema = z.object({
  recipientId: z.string().min(1),
  body: z.string().trim().min(1).max(1000),
});

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const peerId = url.searchParams.get("with");

    const messages = await prisma.message.findMany({
      where: peerId
        ? {
            OR: [
              { senderId: user.id, recipientId: peerId },
              { senderId: peerId, recipientId: user.id },
            ],
          }
        : {
            OR: [{ senderId: user.id }, { recipientId: user.id }],
          },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
        recipient: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: peerId ? "asc" : "desc" },
      take: 100,
    });

    if (peerId) {
      await prisma.message.updateMany({
        where: { senderId: peerId, recipientId: user.id, readAt: null },
        data: { readAt: new Date() },
      });
    }

    return NextResponse.json({ messages });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = sendSchema.parse(await request.json());
    const message = await sendDirectMessage(user.id, body.recipientId, body.body);
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
