import Image from "next/image";
import Link from "next/link";
import { AlertBanner, Card, SectionHeader, StatusPill } from "@/components/ui/primitives";
import { getFacilitiesSnapshot } from "@/server/facilities";

export const metadata = { title: "Gym" };

export default async function GymPage() {
  const snapshot = await getFacilitiesSnapshot();
  const gym = snapshot.facilities.find((f) => f.kind === "GYM");

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-12 sm:px-6">
      <SectionHeader
        eyebrow="Strength & Conditioning"
        title={gym?.name ?? "Fitness & Conditioning Gym"}
        subtitle={gym?.description}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
          <Image
            src="/images/gym-tables.jpg"
            alt="Fitness and athletic conditioning gym interior"
            width={900}
            height={540}
            className="h-full w-full object-cover"
          />
        </div>
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[var(--navy-900)]">Current Operating Status</h2>
            <StatusPill status={gym?.closed ? "MAINTENANCE" : "ACTIVE"} />
          </div>
          <p className="text-sm text-[var(--muted)]">
            Crowd level: <strong>{gym?.crowdLevel ?? "Not reported"}</strong>
          </p>
          {gym?.closed && gym.closedReason ? (
            <AlertBanner tone="warning" title="Closure Notice" body={gym.closedReason} />
          ) : null}
          <p className="text-xs text-slate-600">{snapshot.hoursNote}</p>
          <Link
            href="/portal/facilities"
            className="inline-flex min-h-[44px] items-center rounded-xl bg-[var(--stadium-blue)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Report Equipment Issue or Check Status
          </Link>
        </Card>
      </div>
    </div>
  );
}
