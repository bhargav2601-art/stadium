import { NextResponse } from "next/server";
import { signaturesMatch } from "@/domain/payments";
import { processGameRemindersAndExpiries } from "@/server/games";
import { jsonError } from "@/server/guards";

export async function POST(request: Request) {
  try {
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret) {
      return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
    }
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!token || !signaturesMatch(secret, token)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const summary = await processGameRemindersAndExpiries();
    return NextResponse.json(summary);
  } catch (error) {
    return jsonError(error);
  }
}
