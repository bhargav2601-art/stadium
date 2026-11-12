import { NextResponse } from "next/server";
import { z } from "zod";
import type { FacilityKind } from "@/lib/db";
import { joinCourtQueue, leaveCourtQueue } from "@/server/facilities";
import { assertSameOrigin, jsonError, requireUser } from "@/server/guards";

const VALID_KINDS = new Set(["BADMINTON", "GYM", "TABLE_TENNIS", "YOGA", "BASKETBALL"]);
const queueSchema = z.object({ note: z.string().trim().max(140).nullable().optional() });

export async function POST(request: Request, context: { params: Promise<{ kind: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { kind } = await context.params;
    const upper = kind.toUpperCase();
    if (!VALID_KINDS.has(upper)) return NextResponse.json({ error: "Invalid facility." }, { status: 404 });
    let note: string | null | undefined = null;
    try {
      const parsed = queueSchema.parse(await request.json());
      note = parsed.note;
    } catch {
      // empty body ok
    }
    const entry = await joinCourtQueue(user.id, upper as FacilityKind, note);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ kind: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { kind } = await context.params;
    const upper = kind.toUpperCase();
    if (!VALID_KINDS.has(upper)) return NextResponse.json({ error: "Invalid facility." }, { status: 404 });
    await leaveCourtQueue(user.id, upper as FacilityKind);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
