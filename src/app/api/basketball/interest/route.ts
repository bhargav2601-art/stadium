import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { setBasketballInterest } from "@/server/facilities";
import { assertSameOrigin, getCurrentUser, jsonError, requireUser } from "@/server/guards";

const interestSchema = z.object({
  note: z.string().trim().max(200).nullable().optional(),
});

export async function GET() {
  try {
    const [count, user] = await Promise.all([prisma.basketballInterest.count(), getCurrentUser()]);
    const mine = user
      ? await prisma.basketballInterest.findUnique({ where: { userId: user.id } })
      : null;
    return NextResponse.json({ count, interested: Boolean(mine), note: mine?.note ?? null });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    let note: string | null | undefined = null;
    try {
      const parsed = interestSchema.parse(await request.json());
      note = parsed.note;
    } catch {
      // empty body ok
    }
    const result = await setBasketballInterest(user.id, true, note);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const result = await setBasketballInterest(user.id, false);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
