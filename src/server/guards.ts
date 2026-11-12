import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { can, type Action, type Role } from "@/domain/permissions";
import { prisma } from "@/lib/db";
import { userForToken } from "@/server/auth";
import { AppError, AuthError, ForbiddenError, publicError } from "@/server/errors";
import { requirePlayableMembership, syncMembership } from "@/server/membership";
import { getSessionToken } from "@/server/session-cookie";

export function clientIpFromRequest(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "local";
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const appOrigin = process.env.APP_URL ? new URL(process.env.APP_URL).origin : null;
  try {
    const parsedOrigin = new URL(origin);
    if (appOrigin && parsedOrigin.origin === appOrigin) return;
    if (host && parsedOrigin.host === host) return;
  } catch {
    // fall through to error
  }
  throw new ForbiddenError("Cross-origin request blocked.");
}

export async function getCurrentUser() {
  const token = await getSessionToken();
  const user = await userForToken(token);
  if (!user) return null;
  const [membership, playerProfile] = await Promise.all([
    syncMembership(user.id),
    prisma.playerProfile.findUnique({ where: { userId: user.id } }),
  ]);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    blocked: user.blocked,
    createdAt: user.createdAt,
    membership,
    playerProfile,
  };
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError();
  return user;
}

export async function requireRole(allowed: Role[]) {
  const user = await requireUser();
  if (!allowed.includes(user.role)) throw new ForbiddenError();
  return user;
}

export async function requireAction(action: Action) {
  const user = await requireUser();
  if (!can(user.role, action)) throw new ForbiddenError();
  return user;
}

export async function requireActiveMember() {
  const user = await requireUser();
  const membership = await requirePlayableMembership(user.id);
  return { user, membership };
}

export function serializePublicUser(user: CurrentUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    membershipStatus: user.membership?.status ?? "PENDING",
    membershipExpiresAt: user.membership?.expiresAt ?? null,
    playerProfile: user.playerProfile,
  };
}

export function jsonError(error: unknown) {
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    return NextResponse.json(
      { error: issue?.message || "Invalid request input." },
      { status: 400 },
    );
  }
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: publicError(error) }, { status: 500 });
}
