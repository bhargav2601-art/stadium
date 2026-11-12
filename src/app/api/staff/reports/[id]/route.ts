import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/server/audit";
import { assertSameOrigin, jsonError, requireAction } from "@/server/guards";

const reportPatchSchema = z.object({
  status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireAction("issues.report");
    const { id } = await context.params;
    const body = reportPatchSchema.parse(await request.json());

    const report = await prisma.facilityReport.update({
      where: { id },
      data: { status: body.status },
    });
    await audit(actor.id, "facility_report.status", "FacilityReport", id, { status: body.status });
    return NextResponse.json({ report });
  } catch (error) {
    return jsonError(error);
  }
}
