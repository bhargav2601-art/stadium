import { NextResponse } from "next/server";
import { getCurrentUser, jsonError, serializePublicUser } from "@/server/guards";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user: user ? serializePublicUser(user) : null });
  } catch (error) {
    return jsonError(error);
  }
}
