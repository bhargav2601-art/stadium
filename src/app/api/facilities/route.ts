import { NextResponse } from "next/server";
import { getFacilitiesSnapshot } from "@/server/facilities";
import { jsonError } from "@/server/guards";

export async function GET() {
  try {
    const snapshot = await getFacilitiesSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    return jsonError(error);
  }
}
