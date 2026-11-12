import Link from "next/link";
import { AlertBanner, Card, SectionHeader, StatCard } from "@/components/ui/primitives";
import { formatWhen } from "@/lib/format";
import { getFacilitiesSnapshot } from "@/server/facilities";

export const dynamic = "force-dynamic";
export const metadata = { title: "Basketball Shared-Floor Mode" };

export default async function BasketballPage() {
  const snapshot = await getFacilitiesSnapshot();

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-12 sm:px-6">
      <SectionHeader
        eyebrow="Shared-Floor Conversion"
        title="Basketball Mode"
        subtitle="Basketball sessions share the main indoor floor and are scheduled manually by stadium management when enough members express interest."
        actionHref="/portal/facilities"
        actionLabel="Register Basketball Interest"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Interested Members"
          value={snapshot.basketballInterestCount}
          hint="Target threshold: ~10–15 players"
          accent
        />
        <StatCard
          label="Conversion Policy"
          value="Manual Approval"
          hint="Never switches automatically"
        />
        <StatCard
          label="Shared-Floor Impact"
          value={snapshot.activeBasketball ? "Active Now" : "Badminton Open"}
          hint="Disables all 4 badminton courts during session"
        />
      </div>

      {snapshot.activeBasketball ? (
        <AlertBanner
          tone="warning"
          title="Basketball Session Currently Published"
          body={`Scheduled from ${formatWhen(snapshot.activeBasketball.startsAt)} to ${formatWhen(snapshot.activeBasketball.endsAt)}. All four badminton courts are paused until management ends the session.`}
        />
      ) : (
        <AlertBanner
          tone="info"
          title="How Basketball Mode Works"
          body="Members signal interest inside the portal. Once roughly 10–15 players are interested, administrators may schedule and publish a session, which temporarily sets all four badminton courts to BASKETBALL mode."
        />
      )}

      <Card>
        <Link
          href="/portal/facilities"
          className="inline-flex min-h-[44px] items-center rounded-xl bg-[var(--stadium-blue)] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Opt In to Basketball Interest in Member Portal
        </Link>
      </Card>
    </div>
  );
}
