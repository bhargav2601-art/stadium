import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCheckIn } from "@/server/facilities";
import { assertSameOrigin, jsonError, requireUser } from "@/server/guards";

const checkInSchema = z.object({
  memberId: z.string().min(1),
  facilityKind: z.enum(["BADMINTON", "GYM", "TABLE_TENNIS", "YOGA", "BASKETBALL"]),
  courtId: z.string().nullable().optional(),
  action: z.enum(["IN", "OUT"]),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const staff = await requireUser();
    const body = checkInSchema.parse(await request.json());
    const checkIn = await recordCheckIn(staff.id, staff.role, body);
    return NextResponse.json({ checkIn }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
