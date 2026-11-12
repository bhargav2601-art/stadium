import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, type NotificationType } from "@/lib/db";
import { assertSameOrigin, jsonError, requireUser } from "@/server/guards";

const prefSchema = z.object({
  inApp: z.boolean(),
  mutedTypes: z.array(z.string()).max(20),
});

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = prefSchema.parse(await request.json());
    const preference = await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      update: {
        inApp: body.inApp,
        mutedTypes: body.mutedTypes as NotificationType[],
      },
      create: {
        userId: user.id,
        inApp: body.inApp,
        mutedTypes: body.mutedTypes as NotificationType[],
      },
    });
    return NextResponse.json({ preference });
  } catch (error) {
    return jsonError(error);
  }
}
