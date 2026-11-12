import Link from "next/link";
import { Card, SectionHeader } from "@/components/ui/primitives";
import { getSettings } from "@/server/settings";

export const metadata = { title: "About" };

export default async function AboutPage() {
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-12 sm:px-6">
      <SectionHeader
        eyebrow="About The Stadium"
        title={settings["stadium.name"]}
        subtitle={settings["stadium.tagline"]}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-xl font-bold text-[var(--navy-900)]">Built Around Everyday Players</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Anil Kumble Stadium brings neighborhood players together across badminton, conditioning, table tennis,
            morning yoga, and occasional management-scheduled basketball sessions — all under one transparent monthly
            membership with zero per-game court fees.
          </p>
        </Card>
        <Card>
          <h2 className="text-xl font-bold text-[var(--navy-900)]">Fair Walk-In Courts + Online Coordination</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Badminton operates on a hybrid model: members use the portal to assemble singles or doubles squads and track
            open slots, while physical court allocation at the arena remains strictly first-come-first-served.
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-bold text-[var(--navy-900)]">Hours & Official Information</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">{settings["stadium.hours_note"]}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/facilities"
            className="inline-flex min-h-[44px] items-center rounded-xl bg-[var(--stadium-blue)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Inspect Live Facilities
          </Link>
          <Link
            href="/contact"
            className="inline-flex min-h-[44px] items-center rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--navy-900)]"
          >
            Contact Stadium Desk
          </Link>
        </div>
      </Card>
    </div>
  );
}
