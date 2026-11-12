import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { cleanText } from "@/domain/text";
import { AppError } from "@/server/errors";
import { hashPassword, verifyPassword } from "@/server/passwords";
import { rateLimit } from "@/server/rate-limit";

const SESSION_DAYS = 14;
let dummyHashPromise: Promise<string> | null = null;

function getDummyHash() {
  dummyHashPromise ??= hashPassword("dummy-timing-check");
  return dummyHashPromise;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function registerAccount(input: { name: string; email: string; password: string; phone?: string }) {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError("Enter a valid email address.");
  const limited = rateLimit(`register:${email}`, 5, 60 * 60 * 1000);
  if (!limited.ok) throw new AppError("Too many registration attempts. Try again later.", 429);
  if (input.password.length < 8) throw new AppError("Use a password of at least 8 characters.");
  const name = cleanText(input.name, 80);
  if (name.length < 2) throw new AppError("Enter the name you want other members to see.");
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError("An account with that email already exists.");
  return prisma.user.create({
    data: {
      email,
      name,
      phone: input.phone ? cleanText(input.phone, 20) : null,
      passwordHash: await hashPassword(input.password),
      role: "MEMBER",
      playerProfile: { create: { sports: ["badminton"] } },
      membership: { create: { status: "PENDING" } },
      notificationPreference: { create: {} },
    },
  });
}

export async function authenticate(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const limited = rateLimit(`login:${normalized}`, 10, 15 * 60 * 1000);
  if (!limited.ok) throw new AppError("Too many sign-in attempts. Try again in a few minutes.", 429);
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  const valid = user ? await verifyPassword(password, user.passwordHash) : await verifyPassword(password, await getDummyHash()).then(() => false);
  if (!user || !valid || user.blocked) throw new AppError("Email or password is incorrect.", 401);
  return user;
}

export async function startSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await prisma.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });
  return { token, expiresAt };
}

export async function userForToken(token: string | undefined | null) {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt.getTime() < Date.now() || session.user.blocked) return null;
  return session.user;
}

export async function endSession(token: string | undefined | null) {
  if (!token) return;
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export async function changePassword(userId: string, current: string, next: string) {
  if (next.length < 8) throw new AppError("Use a password of at least 8 characters.");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const valid = await verifyPassword(current, user.passwordHash);
  if (!valid) throw new AppError("The current password is incorrect.");
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(next) } });
  await prisma.session.deleteMany({ where: { userId } });
}
