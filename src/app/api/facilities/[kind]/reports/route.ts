import { NextResponse } from "next/server";
import { z } from "zod";
import type { FacilityKind } from "@/lib/db";
import { reportFacilityIssue } from "@/server/facilities";
import { assertSameOrigin, jsonError, requireUser } from "@/server/guards";

const VALID_KINDS = new Set(["BADMINTON", "GYM", "TABLE_TENNIS", "YOGA", "BASKETBALL"]);

const reportSchema = z.object({
  courtId: z.string().nullable().optional(),
  description: z.string().trim().min(5, "Describe the issue (at least 5 characters).").max(500),
});

export async function POST(request: Request, context: { params: Promise<{ kind: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { kind } = await context.params;
    const upper = kind.toUpperCase();
    if (!VALID_KINDS.has(upper)) return NextResponse.json({ error: "Invalid facility." }, { status: 404 });
    const body = reportSchema.parse(await request.json());
    const report = await reportFacilityIssue(user.id, {
      facilityKind: upper as FacilityKind,
      courtId: body.courtId,
      description: body.description,
    });
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
