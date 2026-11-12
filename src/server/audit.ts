import { prisma } from "@/lib/db";
import type { Prisma } from "../../generated/prisma/client";

export async function audit(actorId: string, action: string, entity: string, entityId: string, metadata: Prisma.InputJsonValue = {}) {
  await prisma.adminAuditLog.create({
    data: { actorId, action, entity, entityId, metadata },
  });
}
