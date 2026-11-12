import { cleanText } from "@/domain/text";
import { prisma } from "@/lib/db";
import { AppError } from "@/server/errors";
import { notifyUsers } from "@/server/notifications";
import type { GameType, PlayStyle, PreferredTime, SkillLevel } from "../../generated/prisma/client";

export async function updateMemberProfile(
  userId: string,
  input: {
    name: string;
    phone?: string | null;
    bio?: string | null;
    skillLevel: SkillLevel;
    preferredGame?: GameType | null;
    preferredTime: PreferredTime;
    playStyle: PlayStyle;
    sports: string[];
    availableNow: boolean;
    intro?: string | null;
  },
) {
  const name = cleanText(input.name, 80);
  if (name.length < 2) throw new AppError("Name must be at least 2 characters.");
  const sports = [...new Set(input.sports.map((s) => cleanText(s.toLowerCase(), 30)).filter(Boolean))].slice(0, 6);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        name,
        phone: input.phone ? cleanText(input.phone, 20) : null,
        bio: input.bio ? cleanText(input.bio, 400) : null,
      },
    });
    const profile = await tx.playerProfile.upsert({
      where: { userId },
      update: {
        skillLevel: input.skillLevel,
        preferredGame: input.preferredGame ?? null,
        preferredTime: input.preferredTime,
        playStyle: input.playStyle,
        sports,
        availableNow: input.availableNow,
        intro: input.intro ? cleanText(input.intro, 300) : null,
      },
      create: {
        userId,
        skillLevel: input.skillLevel,
        preferredGame: input.preferredGame ?? null,
        preferredTime: input.preferredTime,
        playStyle: input.playStyle,
        sports,
        availableNow: input.availableNow,
        intro: input.intro ? cleanText(input.intro, 300) : null,
      },
    });
    return { user, profile };
  });
}

export async function sendDirectMessage(senderId: string, recipientId: string, body: string) {
  if (senderId === recipientId) throw new AppError("You cannot message yourself.");
  const cleanBody = cleanText(body, 1000);
  if (cleanBody.length < 1) throw new AppError("Enter a message before sending.");

  const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
  if (!recipient || recipient.blocked) throw new AppError("Recipient not found.", 404);

  const block = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: senderId, blockedId: recipientId },
        { blockerId: recipientId, blockedId: senderId },
      ],
    },
  });
  if (block) {
    throw new AppError("Direct messages cannot be sent because one of the accounts has blocked the other.", 403);
  }

  const message = await prisma.message.create({
    data: { senderId, recipientId, body: cleanBody },
  });

  await notifyUsers([recipientId], {
    type: "MESSAGE",
    title: "New member message",
    body: cleanBody.slice(0, 100),
    href: `/portal/messages?with=${senderId}`,
  });

  return message;
}
