import { NextResponse } from "next/server";
import { z } from "zod";
import { recordGameAttendance } from "@/server/games";
import { assertSameOrigin, jsonError, requireUser } from "@/server/guards";

const attendanceSchema = z.object({
  marks: z
    .array(
      z.object({
        userId: z.string().min(1),
        status: z.enum(["PRESENT", "ABSENT"]),
      }),
    )
    .min(1)
    .max(8),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const body = attendanceSchema.parse(await request.json());
    await recordGameAttendance(user.id, user.role, id, body.marks);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
