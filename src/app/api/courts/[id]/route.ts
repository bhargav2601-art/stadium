import { NextResponse } from "next/server";
import { z } from "zod";
import { updateCourtStatus } from "@/server/facilities";
import { assertSameOrigin, jsonError, requireUser } from "@/server/guards";

const statusSchema = z.object({
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE", "TRANSITION", "BASKETBALL"]),
  note: z.string().trim().max(200).nullable().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const body = statusSchema.parse(await request.json());
    const court = await updateCourtStatus(user.id, user.role, id, body);
    return NextResponse.json({ court });
  } catch (error) {
    return jsonError(error);
  }
}
