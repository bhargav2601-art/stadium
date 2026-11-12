import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, Dumbbell, ShieldCheck, Users } from "lucide-react";
import { AlertBanner, Badge, Card, SectionHeader, StatusPill } from "@/components/ui/primitives";
import { prisma } from "@/lib/db";
import { formatDay, formatInr } from "@/lib/format";
import { getFacilitiesSnapshot } from "@/server/facilities";
import { getSettings } from "@/server/settings";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [snapshot, settings, openGames] = await Promise.all([
    getFacilitiesSnapshot(),
    getSettings(),
    prisma.game.findMany({
      where: { status: { in: ["OPEN", "WAITING_FOR_REPLACEMENT"] } },
      include: {
        organizer: { select: { name: true } },
        participants: { where: { status: "CONFIRMED" }, select: { id: true } },
      },
      orderBy: [{ date: "asc" }, { period: "asc" }],
      take: 4,
    }),
  ]);

  const badminton = snapshot.facilities.find((f) => f.kind === "BADMINTON");
  const availableCourts = badminton?.courts.filter((c) => c.status === "AVAILABLE").length ?? 0;
  const initialFee = formatInr(Number(settings["membership.initial_paise"]));
  const monthlyFee = formatInr(Number(settings["membership.monthly_paise"]));

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[var(--navy-950)] text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:py-20">
          <div className="space-y-6 lg:col-span-6">
            <Badge tone="lime">4 Badminton Courts · Gym · Table Tennis · Morning Yoga</Badge>
            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
              {settings["stadium.tagline"]}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate-300">
              Anil Kumble Stadium pairs walk-in, first-come-first-served indoor courts with live player
              matchmaking. One membership unlocks every facility — with zero hourly or per-game charges.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/portal/games"
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[var(--lime)] px-6 py-3 text-sm font-bold text-[var(--lime-ink)] transition hover:brightness-95"
              >
                Find a Badminton Match
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/membership"
                className="inline-flex min-h-[48px] items-center rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                View Membership ({initialFee} / {monthlyFee})
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-2xl font-bold text-[#a3e635]">{availableCourts}/4</p>
                <p className="text-xs text-slate-300">Badminton courts open</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-2xl font-bold text-white">{openGames.length}</p>
                <p className="text-xs text-slate-300">Active open games</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-2xl font-bold text-white">{snapshot.basketballInterestCount}</p>
                <p className="text-xs text-slate-300">Basketball interest</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative overflow-hidden rounded-3xl border border-white/15 shadow-2xl">
              <Image
                src="/images/hero-badminton.jpg"
                alt="Indoor badminton stadium courts with overhead arena lighting"
                width={1280}
                height={720}
                priority
                className="aspect-video w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-12 sm:px-6">
        {snapshot.activeBasketball ? (
          <AlertBanner
            tone="warning"
            title="Basketball Shared-Floor Mode Currently Active"
            body="Management has enabled a scheduled basketball session on the shared playing floor. All four badminton courts are paused during this session."
          />
        ) : null}

        {/* Badminton Model Explainer */}
        <section className="space-y-6">
          <SectionHeader
            eyebrow="Badminton Operating Model"
            title="Walk-in court fairness meets smart online matchmaking"
            subtitle="We keep physical play fair for everyone while eliminating the scramble to find a fourth doubles player."
            actionHref="/facilities/badminton"
            actionLabel="Explore Badminton"
          />
          <div className="grid gap-5 md:grid-cols-3">
            <Card>
              <Users className="h-6 w-6 text-[var(--stadium-blue)]" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-bold text-[var(--navy-900)]">1. Coordinate Players Online</h3>
              <p className="mt-1.5 text-sm text-[var(--muted)]">
                Create or join Singles (2 players) and Doubles (2–4 players) games in Open or Approval mode.
                Waitlists auto-offer open slots when someone withdraws.
              </p>
            </Card>
            <Card>
              <CalendarClock className="h-6 w-6 text-[var(--stadium-blue)]" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-bold text-[var(--navy-900)]">2. No Court Reservations</h3>
              <p className="mt-1.5 text-sm text-[var(--muted)]">
                Online games coordinate your group only — they never reserve a court. Physical courts remain
                first-come-first-served so courts never sit empty.
              </p>
            </Card>
            <Card>
              <ShieldCheck className="h-6 w-6 text-[var(--stadium-blue)]" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-bold text-[var(--navy-900)]">3. Live Floor Status</h3>
              <p className="mt-1.5 text-sm text-[var(--muted)]">
                Check real-time statuses across all 4 badminton courts and 2 table tennis tables updated solely
                by authorized stadium staff.
              </p>
            </Card>
          </div>
        </section>

        {/* Live Open Games Preview */}
        <section className="space-y-6">
          <SectionHeader
            eyebrow="Matchmaking Pulse"
            title="Open games looking for players"
            subtitle="Active stadium members can claim open slots or join waitlists inside the Member Portal."
            actionHref="/portal/games"
            actionLabel="View All Games"
          />
          {openGames.length === 0 ? (
            <Card>
              <p className="text-sm text-[var(--muted)]">
                No open games are posted yet. Sign in to the Member Portal to organize the next singles or doubles session.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {openGames.map((game) => (
                <Card key={game.id} className="flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--stadium-blue)]">
                        {game.sport.replace("_", " ")} · {game.gameType}
                      </p>
                      <h3 className="mt-0.5 text-lg font-bold text-[var(--navy-900)]">
                        {formatDay(game.date)} · {game.period === "MORNING" ? "Morning" : "Evening"}
                        {game.startTime ? ` (${game.startTime} IST)` : ""}
                      </h3>
                    </div>
                    <StatusPill status={game.status} />
                  </div>
                  <p className="text-sm text-[var(--muted)]">
                    {game.description || `Organized by ${game.organizer.name}`}
                  </p>
                  <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 text-xs font-semibold text-slate-600">
                    <span>
                      Roster: {game.participants.length}/{game.maxPlayers} confirmed · {game.joinMode}
                    </span>
                    <Link href={`/portal/games/${game.id}`} className="text-[var(--stadium-blue)] hover:underline">
                      Open game →
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Facilities Overview */}
        <section className="space-y-6">
          <SectionHeader
            eyebrow="Stadium Facilities"
            title="Five spaces built for year-round movement"
            subtitle={settings["stadium.hours_note"]}
            actionHref="/facilities"
            actionLabel="All Facilities & Live Status"
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="overflow-hidden p-0">
              <Image
                src="/images/gym-tables.jpg"
                alt="Conditioning gym and blue table tennis tables"
                width={960}
                height={540}
                className="aspect-video w-full object-cover"
              />
              <div className="p-5">
                <h3 className="text-xl font-bold text-[var(--navy-900)]">Gym & Table Tennis Zone</h3>
                <p className="mt-1.5 text-sm text-[var(--muted)]">
                  Strength and agility conditioning floor plus two competition table tennis tables included in your membership.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="/facilities/gym" className="text-sm font-semibold text-[var(--stadium-blue)] hover:underline">
                    Gym details →
                  </Link>
                  <Link href="/facilities/table-tennis" className="text-sm font-semibold text-[var(--stadium-blue)] hover:underline">
                    Table Tennis details →
                  </Link>
                </div>
              </div>
            </Card>
            <Card className="overflow-hidden p-0">
              <Image
                src="/images/yoga-basketball.jpg"
                alt="Sunlit indoor floor for morning yoga and scheduled basketball"
                width={960}
                height={540}
                className="aspect-video w-full object-cover"
              />
              <div className="p-5">
                <h3 className="text-xl font-bold text-[var(--navy-900)]">Morning Yoga & Shared-Floor Basketball</h3>
                <p className="mt-1.5 text-sm text-[var(--muted)]">
                  Morning-only yoga sessions for flexibility and recovery, plus community-driven basketball sessions enabled strictly by management approval.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="/facilities/yoga" className="text-sm font-semibold text-[var(--stadium-blue)] hover:underline">
                    Morning Yoga →
                  </Link>
                  <Link href="/facilities/basketball" className="text-sm font-semibold text-[var(--stadium-blue)] hover:underline">
                    Basketball Mode →
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Membership Pricing */}
        <section className="rounded-3xl bg-[var(--navy-900)] p-8 text-white sm:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-7">
              <Badge tone="lime">Transparent Community Pricing</Badge>
              <h2 className="text-3xl font-bold">One simple membership. Every facility included.</h2>
              <p className="text-sm leading-relaxed text-slate-300">
                No hourly charges, no per-game fees, and no extra badminton court surcharge. Access is valid across
                active membership dates subject to facility hours and availability.
              </p>
              <ul className="grid gap-2 pt-2 text-sm text-slate-200 sm:grid-cols-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#a3e635]" aria-hidden="true" />
                  4 Badminton Courts (FCFS + Matchmaking)
                </li>
                <li className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-[#a3e635]" aria-hidden="true" />
                  Full Conditioning Gym Access
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#a3e635]" aria-hidden="true" />
                  2 Table Tennis Tables
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#a3e635]" aria-hidden="true" />
                  Morning Yoga & Basketball Opt-In
                </li>
              </ul>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-5">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-[#a3e635]">Initial Onboarding</p>
                <p className="mt-2 text-3xl font-bold">{initialFee}</p>
                <p className="mt-1 text-xs text-slate-300">First 30-day membership cycle</p>
              </div>
              <div className="rounded-2xl border border-[#bef264] bg-[#a3e635] p-5 text-[var(--lime-ink)]">
                <p className="text-xs font-bold uppercase tracking-wider">Monthly Renewal</p>
                <p className="mt-2 text-3xl font-bold">{monthlyFee}</p>
                <p className="mt-1 text-xs font-medium">Every 30-day renewal cycle</p>
              </div>
              <Link
                href="/register"
                className="sm:col-span-2 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-[var(--navy-900)] transition hover:bg-slate-100"
              >
                Register & Activate Membership
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
