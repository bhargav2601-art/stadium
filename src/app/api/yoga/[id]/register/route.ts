import { NextResponse } from "next/server";
import { cancelYogaRegistration, registerForYoga } from "@/server/facilities";
import { assertSameOrigin, jsonError, requireUser } from "@/server/guards";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const registration = await registerForYoga(user.id, id);
    return NextResponse.json({ registration }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    await cancelYogaRegistration(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
