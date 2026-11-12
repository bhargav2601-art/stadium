import { NextResponse } from "next/server";
import { z } from "zod";
import { canAssignRole } from "@/domain/permissions";
import { prisma } from "@/lib/db";
import { audit } from "@/server/audit";
import { AppError, ForbiddenError } from "@/server/errors";
import { assertSameOrigin, jsonError, requireAction } from "@/server/guards";
import { extendExpiry } from "@/domain/membership";

const memberPatchSchema = z.object({
  blocked: z.boolean().optional(),
  role: z.enum(["MEMBER", "STAFF", "ADMINISTRATOR", "SUPER_ADMINISTRATOR"]).optional(),
  membershipStatus: z.enum(["PENDING", "ACTIVE", "EXPIRING_SOON", "EXPIRED", "SUSPENDED", "CANCELLED"]).optional(),
  extendDays: z.number().int().min(1).max(365).optional(),
  clearFlag: z.boolean().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireAction("members.manage");
    const { id } = await context.params;
    const body = memberPatchSchema.parse(await request.json());

    const target = await prisma.user.findUnique({
      where: { id },
      include: { membership: true },
    });
    if (!target) throw new AppError("Member not found.", 404);

    if (body.role !== undefined && body.role !== target.role) {
      if (!canAssignRole(actor.role, target.role, body.role, actor.id === target.id)) {
        throw new ForbiddenError("You cannot assign that role to this account.");
      }
    }
    if (body.blocked !== undefined && actor.id === target.id) {
      throw new ForbiddenError("You cannot block your own account.");
    }

    await prisma.$transaction(async (tx) => {
      if (body.blocked !== undefined || body.role !== undefined) {
        await tx.user.update({
          where: { id },
          data: {
            ...(body.blocked !== undefined ? { blocked: body.blocked } : {}),
            ...(body.role !== undefined ? { role: body.role } : {}),
          },
        });
        if (body.blocked) {
          await tx.session.deleteMany({ where: { userId: id } });
        }
      }

      if (body.clearFlag) {
        await tx.playerProfile.updateMany({
          where: { userId: id },
          data: { flaggedForReview: false },
        });
      }

      if (target.membership && (body.membershipStatus !== undefined || body.extendDays !== undefined)) {
        const now = new Date();
        const nextExpiry = body.extendDays
          ? extendExpiry(target.membership.expiresAt, now, body.extendDays)
          : target.membership.expiresAt;
        await tx.membership.update({
          where: { id: target.membership.id },
          data: {
            ...(body.membershipStatus ? { status: body.membershipStatus } : {}),
            ...(body.extendDays
              ? {
                  status: "ACTIVE",
                  startedAt: target.membership.startedAt ?? now,
                  expiresAt: nextExpiry,
                }
              : {}),
          },
        });
      }
    });

    await audit(actor.id, "member.update", "User", id, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
