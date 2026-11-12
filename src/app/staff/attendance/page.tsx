import { redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { AttendanceDeskClient } from "@/components/staff/AttendanceDeskClient";
import { can } from "@/domain/permissions";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/server/guards";

export const metadata = { title: "Game Attendance Desk" };

export default async function StaffAttendancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/staff/attendance");
  if (!can(user.role, "attendance.view")) redirect("/portal");

  const games = await prisma.game.findMany({
    where: { status: { not: "CANCELLED" } },
    include: {
      organizer: { select: { name: true } },
      participants: {
        where: { status: "CONFIRMED" },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { joinedAt: "asc" },
      },
      attendance: true,
    },
    orderBy: [{ date: "desc" }, { period: "asc" }],
    take: 30,
  });

  return (
    <PortalShell
      section="staff"
      title="Game Attendance & No-Show Desk"
      subtitle="Verify confirmed players for scheduled games and mark absences."
    >
      <AttendanceDeskClient
        games={games.map((g) => ({
          id: g.id,
          sport: g.sport,
          gameType: g.gameType,
          date: g.date.toISOString(),
          period: g.period,
          startTime: g.startTime,
          status: g.status,
          organizerName: g.organizer.name,
          participants: g.participants.map((p) => ({ userId: p.userId, name: p.user.name })),
          existingMarks: Object.fromEntries(
            g.attendance.map((a) => [a.userId, a.status === "ABSENT" ? "ABSENT" : "PRESENT"]),
          ),
        }))}
      />
    </PortalShell>
  );
}
