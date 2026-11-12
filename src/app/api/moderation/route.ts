import { NextResponse } from "next/server";
import { z } from "zod";
import { cleanText } from "@/domain/text";
import { prisma } from "@/lib/db";
import { AppError } from "@/server/errors";
import { assertSameOrigin, jsonError, requireUser } from "@/server/guards";
import { notifyAdmins } from "@/server/notifications";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("BLOCK"), targetUserId: z.string().min(1) }),
  z.object({ action: z.literal("UNBLOCK"), targetUserId: z.string().min(1) }),
  z.object({
    action: z.literal("REPORT"),
    targetUserId: z.string().min(1),
    reason: z.string().trim().min(5).max(500),
  }),
]);

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = actionSchema.parse(await request.json());
    if (body.targetUserId === user.id) throw new AppError("You cannot block or report yourself.");

    if (body.action === "BLOCK") {
      await prisma.userBlock.upsert({
        where: { blockerId_blockedId: { blockerId: user.id, blockedId: body.targetUserId } },
        update: {},
        create: { blockerId: user.id, blockedId: body.targetUserId },
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "UNBLOCK") {
      await prisma.userBlock.deleteMany({
        where: { blockerId: user.id, blockedId: body.targetUserId },
      });
      return NextResponse.json({ ok: true });
    }

    const report = await prisma.memberReport.create({
      data: {
        reporterId: user.id,
        reportedId: body.targetUserId,
        reason: cleanText(body.reason, 500),
      },
    });
    await notifyAdmins({
      type: "STADIUM_ANNOUNCEMENT",
      title: "Member moderation report submitted",
      body: "A member submitted a safety/conduct report for review.",
      href: "/admin/reports",
    });
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
