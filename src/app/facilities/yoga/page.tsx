import Image from "next/image";
import Link from "next/link";
import { AlertBanner, Badge, Card, SectionHeader } from "@/components/ui/primitives";
import { formatWhen } from "@/lib/format";
import { getFacilitiesSnapshot } from "@/server/facilities";

export const dynamic = "force-dynamic";
export const metadata = { title: "Morning Yoga" };

export default async function YogaPage() {
  const snapshot = await getFacilitiesSnapshot();
  const yoga = snapshot.facilities.find((f) => f.kind === "YOGA");

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-12 sm:px-6">
      <SectionHeader
        eyebrow="Morning-Only Sessions"
        title={yoga?.name ?? "Morning Yoga Studio"}
        subtitle="Yoga at Anil Kumble Stadium runs strictly during morning hours (05:00–12:00 IST) for mobility, breathwork, and athletic recovery."
        actionHref="/portal/facilities"
        actionLabel="Register in Member Portal"
      />

      <div className="grid gap-6 md:grid-cols-12">
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] md:col-span-5">
          <Image
            src="/images/yoga-basketball.jpg"
            alt="Sunlit studio ready for morning yoga"
            width={800}
            height={520}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="space-y-4 md:col-span-7">
          <AlertBanner
            tone="info"
            title="Morning-Only Schedule Policy"
            body="Evening yoga classes are not offered. Upcoming sessions published by management appear below."
          />

          {snapshot.upcomingYoga.length === 0 ? (
            <Card>
              <p className="text-sm text-[var(--muted)]">No upcoming morning yoga sessions are scheduled yet.</p>
            </Card>
          ) : (
            snapshot.upcomingYoga.map((session) => (
              <Card key={session.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge tone="lime">Morning Session</Badge>
                    <h2 className="mt-2 text-lg font-bold text-[var(--navy-900)]">{session.title}</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {formatWhen(session.startsAt)} — {formatWhen(session.endsAt)}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600">
                    {session.registrations.length}
                    {session.capacity ? `/${session.capacity}` : ""} registered
                  </span>
                </div>
                {session.notes ? <p className="mt-2 text-xs text-slate-600">{session.notes}</p> : null}
              </Card>
            ))
          )}

          <Link
            href="/portal/facilities"
            className="inline-flex min-h-[44px] items-center rounded-xl bg-[var(--stadium-blue)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Reserve Your Yoga Spot
          </Link>
        </div>
      </div>
    </div>
  );
}
