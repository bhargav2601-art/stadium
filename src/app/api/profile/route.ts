import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, jsonError, requireUser, serializePublicUser } from "@/server/guards";
import { updateMemberProfile } from "@/server/profile";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(20).nullable().optional(),
  bio: z.string().trim().max(400).nullable().optional(),
  skillLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  preferredGame: z.enum(["SINGLES", "DOUBLES"]).nullable().optional(),
  preferredTime: z.enum(["MORNING", "EVENING", "BOTH"]),
  playStyle: z.enum(["CASUAL", "COMPETITIVE"]),
  sports: z.array(z.string().trim().min(1).max(30)).max(6),
  availableNow: z.boolean(),
  intro: z.string().trim().max(300).nullable().optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ user: serializePublicUser(user) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = profileSchema.parse(await request.json());
    const result = await updateMemberProfile(user.id, body);
    return NextResponse.json({
      user: {
        id: result.user.id,
        name: result.user.name,
        phone: result.user.phone,
        bio: result.user.bio,
        playerProfile: result.profile,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
