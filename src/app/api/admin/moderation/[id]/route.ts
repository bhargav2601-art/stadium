import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/server/audit";
import { assertSameOrigin, jsonError, requireAction } from "@/server/guards";

const moderationPatchSchema = z.object({
  status: z.enum(["OPEN", "REVIEWED", "DISMISSED"]),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireAction("reports.view");
    const { id } = await context.params;
    const body = moderationPatchSchema.parse(await request.json());
    const report = await prisma.memberReport.update({
      where: { id },
      data: { status: body.status },
    });
    await audit(actor.id, "member_report.update", "MemberReport", id, { status: body.status });
    return NextResponse.json({ report });
  } catch (error) {
    return jsonError(error);
  }
}
