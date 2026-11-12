import { NextResponse } from "next/server";
import { z } from "zod";
import { cleanText } from "@/domain/text";
import { prisma, type FacilityKind } from "@/lib/db";
import { audit } from "@/server/audit";
import { AppError } from "@/server/errors";
import { assertSameOrigin, jsonError, requireAction } from "@/server/guards";
import { notifyUsers } from "@/server/notifications";

const VALID_KINDS = new Set(["BADMINTON", "GYM", "TABLE_TENNIS", "YOGA", "BASKETBALL"]);

const facilityPatchSchema = z.object({
  closed: z.boolean().optional(),
  closedReason: z.string().trim().max(200).nullable().optional(),
  crowdLevel: z.string().trim().max(40).nullable().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ kind: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireAction("facilities.manage");
    const { kind } = await context.params;
    const upper = kind.toUpperCase();
    if (!VALID_KINDS.has(upper)) throw new AppError("Facility not found.", 404);
    const body = facilityPatchSchema.parse(await request.json());

    const facility = await prisma.facility.update({
      where: { kind: upper as FacilityKind },
      data: {
        ...(body.closed !== undefined ? { closed: body.closed } : {}),
        ...(body.closedReason !== undefined
          ? { closedReason: body.closedReason ? cleanText(body.closedReason, 200) : null }
          : {}),
        ...(body.crowdLevel !== undefined
          ? { crowdLevel: body.crowdLevel ? cleanText(body.crowdLevel, 40) : null }
          : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
      },
    });

    await audit(actor.id, "facility.update", "Facility", facility.id, body);

    if (body.closed !== undefined) {
      const members = await prisma.membership.findMany({
        where: { status: { in: ["ACTIVE", "EXPIRING_SOON"] } },
        select: { userId: true },
      });
      await notifyUsers(
        members.map((m) => m.userId),
        {
          type: "FACILITY_CLOSURE",
          title: body.closed ? `${facility.name} temporarily closed` : `${facility.name} reopened`,
          body: body.closed
            ? facility.closedReason || "Temporarily closed by stadium management."
            : "This facility is now open during operating hours.",
          href: "/portal/facilities",
        },
      );
    }

    return NextResponse.json({ facility });
  } catch (error) {
    return jsonError(error);
  }
}
