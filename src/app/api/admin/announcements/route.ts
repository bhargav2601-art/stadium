import { NextResponse } from "next/server";
import { z } from "zod";
import { cleanText } from "@/domain/text";
import { prisma } from "@/lib/db";
import { audit } from "@/server/audit";
import { assertSameOrigin, jsonError, requireAction } from "@/server/guards";
import { notifyUsers } from "@/server/notifications";

const announcementSchema = z.object({
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(5).max(500),
  audience: z.enum(["ALL", "ACTIVE"]).default("ACTIVE"),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireAction("announcements.send");
    const input = announcementSchema.parse(await request.json());

    const users = await prisma.user.findMany({
      where: {
        blocked: false,
        ...(input.audience === "ACTIVE"
          ? { membership: { status: { in: ["ACTIVE", "EXPIRING_SOON"] } } }
          : {}),
      },
      select: { id: true },
    });

    const title = cleanText(input.title, 120);
    const body = cleanText(input.body, 500);
    await notifyUsers(
      users.map((u) => u.id),
      {
        type: "STADIUM_ANNOUNCEMENT",
        title,
        body,
        href: "/portal/notifications",
      },
    );

    await audit(actor.id, "announcement.send", "Notification", "broadcast", {
      title,
      audience: input.audience,
      recipients: users.length,
    });
    return NextResponse.json({ sent: users.length }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
