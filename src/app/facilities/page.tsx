import Link from "next/link";
import { AlertBanner, Badge, Card, SectionHeader, StatusPill } from "@/components/ui/primitives";
import { isStatusStale } from "@/domain/staleness";
import { formatWhen } from "@/lib/format";
import { getFacilitiesSnapshot } from "@/server/facilities";

export const metadata = { title: "Facilities" };

const KIND_ROUTES: Record<string, string> = {
  BADMINTON: "/facilities/badminton",
  GYM: "/facilities/gym",
  TABLE_TENNIS: "/facilities/table-tennis",
  YOGA: "/facilities/yoga",
  BASKETBALL: "/facilities/basketball",
};

export default async function FacilitiesPage() {
  const snapshot = await getFacilitiesSnapshot();
  const now = new Date();

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6">
      <SectionHeader
        eyebrow="Live Stadium Pulse"
        title="Facilities & Court Status"
        subtitle={snapshot.hoursNote}
        actionHref="/portal/facilities"
        actionLabel="Member Facility Controls"
      />

      {snapshot.activeBasketball ? (
        <AlertBanner
          tone="warning"
          title="Basketball Shared-Floor Session Active"
          body={`All four badminton courts are temporarily disabled for basketball from ${formatWhen(snapshot.activeBasketball.startsAt)} to ${formatWhen(snapshot.activeBasketball.endsAt)}.`}
        />
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        {snapshot.facilities.map((facility) => (
          <Card key={facility.id} className="flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge tone="blue">{facility.kind.replace("_", " ")}</Badge>
                  <h2 className="mt-2 text-xl font-bold text-[var(--navy-900)]">{facility.name}</h2>
                </div>
                <StatusPill status={facility.closed ? "MAINTENANCE" : "ACTIVE"} />
              </div>
              <p className="text-sm text-[var(--muted)]">{facility.description}</p>

              {facility.courts.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {facility.courts.map((court) => {
                    const stale = isStatusStale(court.statusUpdatedAt, now, snapshot.staleMinutes);
                    return (
                      <div key={court.id} className="rounded-xl border border-[var(--border)] bg-slate-50 p-2.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-[var(--navy-900)]">{court.name}</span>
                          <StatusPill status={court.status} />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {stale ? "Status may be stale" : `Updated ${formatWhen(court.statusUpdatedAt)}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 text-sm">
              <span className="text-xs font-medium text-slate-600">
                Crowd: {facility.crowdLevel ?? "Not reported"}
              </span>
              <Link
                href={KIND_ROUTES[facility.kind] ?? "/facilities"}
                className="font-semibold text-[var(--stadium-blue)] hover:underline"
              >
                Details & schedules →
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
