import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/server/audit";
import { assertSameOrigin, jsonError, requireAction } from "@/server/guards";

const assignmentSchema = z.object({
  userId: z.string().min(1),
  facilityId: z.string().min(1),
  action: z.enum(["ASSIGN", "REMOVE"]),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireAction("staff.manage");
    const body = assignmentSchema.parse(await request.json());

    if (body.action === "ASSIGN") {
      await prisma.staffAssignment.upsert({
        where: { userId_facilityId: { userId: body.userId, facilityId: body.facilityId } },
        update: {},
        create: { userId: body.userId, facilityId: body.facilityId },
      });
    } else {
      await prisma.staffAssignment.deleteMany({
        where: { userId: body.userId, facilityId: body.facilityId },
      });
    }

    await audit(actor.id, "staff.assignment", "StaffAssignment", body.userId, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
