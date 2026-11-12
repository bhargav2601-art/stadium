import Link from "next/link";
import { AlertBanner, Card, SectionHeader } from "@/components/ui/primitives";
import { getSettings } from "@/server/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contact" };

export default async function ContactPage() {
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 sm:px-6">
      <SectionHeader
        eyebrow="Stadium Contact"
        title={`Contact ${settings["stadium.name"]}`}
        subtitle="Official contact details are managed directly by the Super Administrator in System Settings."
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Address</p>
          <p className="mt-2 text-sm font-medium text-[var(--navy-900)]">{settings["stadium.address"]}</p>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Phone</p>
          <p className="mt-2 text-sm font-medium text-[var(--navy-900)]">{settings["stadium.phone"]}</p>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Email</p>
          <p className="mt-2 text-sm font-medium text-[var(--navy-900)]">{settings["stadium.email"]}</p>
        </Card>
      </div>

      <AlertBanner tone="warning" title="Operating Hours Notice" body={settings["stadium.hours_note"]} />

      <Card>
        <h2 className="text-lg font-bold text-[var(--navy-900)]">Need to report a court or facility issue?</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Signed-in members can file maintenance or lighting reports directly from the facilities portal so floor staff
          receive them immediately.
        </p>
        <Link
          href="/portal/facilities"
          className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-[var(--stadium-blue)] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Go to Live Facilities
        </Link>
      </Card>
    </div>
  );
}
