import { redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { MessagesClient } from "@/components/portal/MessagesClient";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/server/guards";

export const metadata = { title: "Messages" };

export default async function PortalMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ with?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/portal/messages");
  const { with: peerParam } = await searchParams;

  const recent = await prisma.message.findMany({
    where: { OR: [{ senderId: user.id }, { recipientId: user.id }] },
    include: {
      sender: { select: { id: true, name: true } },
      recipient: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  const peerMap = new Map<string, { id: string; name: string }>();
  for (const m of recent) {
    const other = m.senderId === user.id ? m.recipient : m.sender;
    if (!peerMap.has(other.id)) peerMap.set(other.id, other);
  }

  let selectedPeer = peerParam ? peerMap.get(peerParam) ?? null : null;
  if (peerParam && !selectedPeer && peerParam !== user.id) {
    const candidate = await prisma.user.findUnique({
      where: { id: peerParam },
      select: { id: true, name: true },
    });
    if (candidate) {
      selectedPeer = candidate;
      peerMap.set(candidate.id, candidate);
    }
  }

  const threadMessages = selectedPeer
    ? await prisma.message.findMany({
        where: {
          OR: [
            { senderId: user.id, recipientId: selectedPeer.id },
            { senderId: selectedPeer.id, recipientId: user.id },
          ],
        },
        include: {
          sender: { select: { id: true, name: true } },
          recipient: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <PortalShell section="member" title="Member Messages" subtitle="Direct coordination with other stadium players.">
      <MessagesClient
        currentUserId={user.id}
        peers={[...peerMap.values()]}
        selectedPeer={selectedPeer}
        messages={threadMessages.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </PortalShell>
  );
}
