import Link from "next/link";
import { Badge, Card, SectionHeader, StatusPill } from "@/components/ui/primitives";
import { formatWhen } from "@/lib/format";
import { getFacilitiesSnapshot } from "@/server/facilities";

export const metadata = { title: "Table Tennis" };

export default async function TableTennisPage() {
  const snapshot = await getFacilitiesSnapshot();
  const tt = snapshot.facilities.find((f) => f.kind === "TABLE_TENNIS");

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-12 sm:px-6">
      <SectionHeader
        eyebrow="2 Tables"
        title={tt?.name ?? "Table Tennis Zone"}
        subtitle={tt?.description}
        actionHref="/portal/games"
        actionLabel="Coordinate Table Tennis Game"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {tt?.courts.map((table) => (
          <Card key={table.id}>
            <div className="flex items-center justify-between">
              <Badge tone="navy">{table.code}</Badge>
              <StatusPill status={table.status} />
            </div>
            <h2 className="mt-2 text-xl font-bold text-[var(--navy-900)]">{table.name}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {table.statusNote || "Included in stadium membership on a walk-in basis."}
            </p>
            <p className="mt-3 text-xs text-slate-500">Updated {formatWhen(table.statusUpdatedAt)}</p>
          </Card>
        ))}
      </div>

      <Card>
        <p className="text-sm text-[var(--muted)]">{snapshot.hoursNote}</p>
        <Link
          href="/portal/availability"
          className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-[var(--stadium-blue)] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Post Table Tennis Availability
        </Link>
      </Card>
    </div>
  );
}
