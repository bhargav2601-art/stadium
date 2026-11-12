import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { addDays, dateFromIso, kolkataParts } from "../src/domain/time";
import { hashPassword } from "../src/server/passwords";
import { SETTING_DEFAULTS } from "../src/server/settings";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run prisma/seed.ts.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const FACILITIES = [
  {
    kind: "BADMINTON" as const,
    name: "Badminton Courts",
    summary: "Four indoor courts operating first-come-first-served for active members.",
    description:
      "Four regulation indoor badminton courts shared with our online matchmaking system. Online games coordinate players only and never reserve a physical court. Physical court usage remains first-come-first-served.",
    crowdLevel: "Moderate",
  },
  {
    kind: "GYM" as const,
    name: "Fitness & Conditioning Gym",
    summary: "Strength, cardio, and agility conditioning floor included in stadium membership.",
    description:
      "Dedicated fitness and athletic conditioning zone included with your Anil Kumble Stadium membership during operating hours.",
    crowdLevel: "Light",
  },
  {
    kind: "TABLE_TENNIS" as const,
    name: "Table Tennis Zone",
    summary: "Two competition-grade table tennis tables for singles and doubles play.",
    description:
      "Two dedicated table tennis tables available to active members on a walk-in and player-coordination basis.",
    crowdLevel: "Light",
  },
  {
    kind: "YOGA" as const,
    name: "Morning Yoga Studio",
    summary: "Morning-only guided mobility, breathwork, and recovery sessions.",
    description:
      "Morning-only group yoga sessions designed for stamina, joint care, and athletic recovery. Evening sessions are not scheduled.",
    crowdLevel: "Calm",
  },
  {
    kind: "BASKETBALL" as const,
    name: "Basketball Shared-Floor Mode",
    summary: "Special shared-floor sessions enabled only by management approval with 10–15 interested players.",
    description:
      "Basketball converts the shared main playing floor and temporarily disables all four badminton courts for the scheduled session. Conversions are never automatic and require management approval plus sufficient player interest.",
    crowdLevel: "Standby",
  },
];

async function seedCoreData() {
  for (const [key, value] of Object.entries(SETTING_DEFAULTS)) {
    await prisma.applicationSetting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }

  await prisma.membershipPlan.upsert({
    where: { code: "INITIAL" },
    update: {
      name: "Initial Stadium Membership",
      amountPaise: 500000,
      intervalDays: 30,
      active: true,
    },
    create: {
      code: "INITIAL",
      name: "Initial Stadium Membership",
      amountPaise: 500000,
      intervalDays: 30,
      active: true,
    },
  });

  await prisma.membershipPlan.upsert({
    where: { code: "MONTHLY_RENEWAL" },
    update: {
      name: "Monthly Membership Renewal",
      amountPaise: 100000,
      intervalDays: 30,
      active: true,
    },
    create: {
      code: "MONTHLY_RENEWAL",
      name: "Monthly Membership Renewal",
      amountPaise: 100000,
      intervalDays: 30,
      active: true,
    },
  });

  const facilityMap = new Map<string, string>();
  for (const item of FACILITIES) {
    const facility = await prisma.facility.upsert({
      where: { kind: item.kind },
      update: {
        name: item.name,
        summary: item.summary,
        description: item.description,
      },
      create: {
        kind: item.kind,
        name: item.name,
        summary: item.summary,
        description: item.description,
        active: true,
        closed: false,
        crowdLevel: item.crowdLevel,
      },
    });
    facilityMap.set(item.kind, facility.id);
  }

  const badmintonId = facilityMap.get("BADMINTON")!;
  for (const [index, code] of ["B1", "B2", "B3", "B4"].entries()) {
    await prisma.court.upsert({
      where: { facilityId_code: { facilityId: badmintonId, code } },
      update: {},
      create: {
        facilityId: badmintonId,
        code,
        name: `Badminton Court ${index + 1}`,
        status: "AVAILABLE",
      },
    });
  }

  const ttId = facilityMap.get("TABLE_TENNIS")!;
  for (const [index, code] of ["TT1", "TT2"].entries()) {
    await prisma.court.upsert({
      where: { facilityId_code: { facilityId: ttId, code } },
      update: {},
      create: {
        facilityId: ttId,
        code,
        name: `Table ${index + 1}`,
        status: "AVAILABLE",
      },
    });
  }

  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    for (const kind of ["BADMINTON", "GYM", "TABLE_TENNIS"] as const) {
      const facilityId = facilityMap.get(kind)!;
      await prisma.facilitySchedule.upsert({
        where: { facilityId_dayOfWeek_period: { facilityId, dayOfWeek, period: "MORNING" } },
        update: {},
        create: {
          facilityId,
          dayOfWeek,
          period: "MORNING",
          opensAt: "06:00",
          closesAt: "10:00",
          provisional: true,
        },
      });
      await prisma.facilitySchedule.upsert({
        where: { facilityId_dayOfWeek_period: { facilityId, dayOfWeek, period: "EVENING" } },
        update: {},
        create: {
          facilityId,
          dayOfWeek,
          period: "EVENING",
          opensAt: "16:00",
          closesAt: "21:00",
          provisional: true,
        },
      });
    }

    const yogaId = facilityMap.get("YOGA")!;
    await prisma.facilitySchedule.upsert({
      where: { facilityId_dayOfWeek_period: { facilityId: yogaId, dayOfWeek, period: "MORNING" } },
      update: {},
      create: {
        facilityId: yogaId,
        dayOfWeek,
        period: "MORNING",
        opensAt: "06:00",
        closesAt: "09:00",
        provisional: true,
      },
    });
  }
}

async function seedSuperAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("Skipping super administrator bootstrap: SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD is not set.");
    return null;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return existing;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 365 * 86_400_000);
  const admin = await prisma.user.create({
    data: {
      email,
      name: "Stadium Super Administrator",
      passwordHash: await hashPassword(password),
      role: "SUPER_ADMINISTRATOR",
      playerProfile: { create: { sports: ["badminton"], skillLevel: "INTERMEDIATE", playStyle: "CASUAL" } },
      membership: { create: { status: "ACTIVE", startedAt: now, expiresAt } },
      notificationPreference: { create: { inApp: true, email: false } },
    },
  });
  console.log(`Created super administrator account (${email}).`);
  return admin;
}

async function seedDemoData(superAdminId?: string) {
  if (process.env.NODE_ENV === "production") {
    console.log("Ignoring SEED_DEMO_DATA in production environment.");
    return;
  }
  if (process.env.SEED_DEMO_DATA !== "true") {
    console.log("Skipping demo data (SEED_DEMO_DATA !== 'true').");
    return;
  }
  const demoPassword = process.env.SEED_DEMO_PASSWORD;
  if (!demoPassword || demoPassword.length < 8) {
    console.log("Skipping demo data: SEED_DEMO_PASSWORD is missing or shorter than 8 characters.");
    return;
  }

  const passwordHash = await hashPassword(demoPassword);
  const now = new Date();
  const activeExpiry = new Date(now.getTime() + 25 * 86_400_000);
  const soonExpiry = new Date(now.getTime() + 4 * 86_400_000);

  const accounts = [
    {
      email: "admin.demo@stadium.local",
      name: "Kavitha Rao",
      role: "ADMINISTRATOR" as const,
      membershipStatus: "ACTIVE" as const,
      expiresAt: activeExpiry,
      skillLevel: "INTERMEDIATE" as const,
      playStyle: "COMPETITIVE" as const,
      availableNow: false,
      intro: "Club operations lead and regular evening doubles player.",
    },
    {
      email: "staff.demo@stadium.local",
      name: "Rohan Deshmukh",
      role: "STAFF" as const,
      membershipStatus: "ACTIVE" as const,
      expiresAt: activeExpiry,
      skillLevel: "INTERMEDIATE" as const,
      playStyle: "CASUAL" as const,
      availableNow: false,
      intro: "Floor coordinator managing court turnover and member check-ins.",
    },
    {
      email: "arjun.member@stadium.local",
      name: "Arjun Nair",
      role: "MEMBER" as const,
      membershipStatus: "ACTIVE" as const,
      expiresAt: activeExpiry,
      skillLevel: "ADVANCED" as const,
      playStyle: "COMPETITIVE" as const,
      availableNow: true,
      intro: "Fast-paced morning singles & evening doubles. Always up for 3-setters.",
    },
    {
      email: "meera.member@stadium.local",
      name: "Meera Krishnan",
      role: "MEMBER" as const,
      membershipStatus: "ACTIVE" as const,
      expiresAt: activeExpiry,
      skillLevel: "INTERMEDIATE" as const,
      playStyle: "CASUAL" as const,
      availableNow: true,
      intro: "Evening badminton doubles & morning yoga regular.",
    },
    {
      email: "vikram.member@stadium.local",
      name: "Vikram Shetty",
      role: "MEMBER" as const,
      membershipStatus: "EXPIRING_SOON" as const,
      expiresAt: soonExpiry,
      skillLevel: "BEGINNER" as const,
      playStyle: "CASUAL" as const,
      availableNow: false,
      intro: "Learning badminton footwork and table tennis rallies.",
    },
    {
      email: "diya.pending@stadium.local",
      name: "Diya Menon",
      role: "MEMBER" as const,
      membershipStatus: "PENDING" as const,
      expiresAt: null,
      skillLevel: "BEGINNER" as const,
      playStyle: "CASUAL" as const,
      availableNow: false,
      intro: "New applicant completing initial membership onboarding.",
    },
  ];

  const usersByEmail = new Map<string, string>();
  for (const acct of accounts) {
    const existing = await prisma.user.findUnique({ where: { email: acct.email } });
    if (existing) {
      usersByEmail.set(acct.email, existing.id);
      continue;
    }
    const created = await prisma.user.create({
      data: {
        email: acct.email,
        name: acct.name,
        passwordHash,
        role: acct.role,
        playerProfile: {
          create: {
            skillLevel: acct.skillLevel,
            playStyle: acct.playStyle,
            preferredGame: "DOUBLES",
            preferredTime: "BOTH",
            sports: ["badminton", "table_tennis"],
            availableNow: acct.availableNow,
            intro: acct.intro,
          },
        },
        membership: {
          create: {
            status: acct.membershipStatus,
            startedAt: acct.expiresAt ? new Date(now.getTime() - 10 * 86_400_000) : null,
            expiresAt: acct.expiresAt,
          },
        },
        notificationPreference: { create: { inApp: true, email: false } },
      },
    });
    usersByEmail.set(acct.email, created.id);
  }

  const staffId = usersByEmail.get("staff.demo@stadium.local");
  const badmintonFacility = await prisma.facility.findUnique({ where: { kind: "BADMINTON" } });
  const ttFacility = await prisma.facility.findUnique({ where: { kind: "TABLE_TENNIS" } });
  if (staffId && badmintonFacility && ttFacility) {
    await prisma.staffAssignment.upsert({
      where: { userId_facilityId: { userId: staffId, facilityId: badmintonFacility.id } },
      update: {},
      create: { userId: staffId, facilityId: badmintonFacility.id },
    });
    await prisma.staffAssignment.upsert({
      where: { userId_facilityId: { userId: staffId, facilityId: ttFacility.id } },
      update: {},
      create: { userId: staffId, facilityId: ttFacility.id },
    });
  }

  const arjunId = usersByEmail.get("arjun.member@stadium.local");
  const meeraId = usersByEmail.get("meera.member@stadium.local");
  const vikramId = usersByEmail.get("vikram.member@stadium.local");
  const adminId = usersByEmail.get("admin.demo@stadium.local") ?? superAdminId;

  if (arjunId && meeraId && vikramId) {
    const todayIso = kolkataParts(now).date;
    const tomorrowIso = addDays(todayIso, 1);

    await prisma.playerAvailability.upsert({
      where: {
        userId_date_period_sport: {
          userId: arjunId,
          date: dateFromIso(tomorrowIso),
          period: "MORNING",
          sport: "BADMINTON",
        },
      },
      update: {},
      create: {
        userId: arjunId,
        date: dateFromIso(tomorrowIso),
        period: "MORNING",
        sport: "BADMINTON",
        note: "06:30–08:00 competitive drills or singles",
      },
    });

    await prisma.playerAvailability.upsert({
      where: {
        userId_date_period_sport: {
          userId: meeraId,
          date: dateFromIso(tomorrowIso),
          period: "EVENING",
          sport: "BADMINTON",
        },
      },
      update: {},
      create: {
        userId: meeraId,
        date: dateFromIso(tomorrowIso),
        period: "EVENING",
        sport: "BADMINTON",
        note: "Looking for 2 more for doubles around 18:30",
      },
    });

    const existingGamesCount = await prisma.game.count();
    if (existingGamesCount === 0) {
      await prisma.game.create({
        data: {
          sport: "BADMINTON",
          gameType: "DOUBLES",
          date: dateFromIso(tomorrowIso),
          period: "EVENING",
          startTime: "18:30",
          skillLevel: "INTERMEDIATE",
          playStyle: "CASUAL",
          maxPlayers: 4,
          joinMode: "OPEN",
          status: "OPEN",
          description: "Friendly 4-player evening doubles rotation — feather shuttles.",
          organizerId: meeraId,
          participants: {
            create: [
              { userId: meeraId, status: "CONFIRMED" },
              { userId: vikramId, status: "CONFIRMED" },
            ],
          },
        },
      });

      await prisma.game.create({
        data: {
          sport: "BADMINTON",
          gameType: "SINGLES",
          date: dateFromIso(tomorrowIso),
          period: "MORNING",
          startTime: "07:00",
          skillLevel: "ADVANCED",
          playStyle: "COMPETITIVE",
          maxPlayers: 2,
          joinMode: "APPROVAL",
          status: "OPEN",
          description: "Best-of-3 competitive morning singles match.",
          organizerId: arjunId,
          participants: {
            create: [{ userId: arjunId, status: "CONFIRMED" }],
          },
        },
      });
    }
  }

  if (adminId) {
    const existingYoga = await prisma.yogaSession.count();
    if (existingYoga === 0) {
      const tomorrowIso = addDays(kolkataParts(now).date, 1);
      const startsAt = new Date(`${tomorrowIso}T06:30:00+05:30`);
      const endsAt = new Date(`${tomorrowIso}T07:30:00+05:30`);
      await prisma.yogaSession.create({
        data: {
          title: "Sunrise Mobility & Court Recovery Yoga",
          startsAt,
          endsAt,
          capacity: 20,
          notes: "Bring your own mat. Morning studio session only.",
          createdById: adminId,
        },
      });
    }
  }

  console.log("Seeded development demo accounts, availability, open games, and morning yoga session.");
}

async function main() {
  await seedCoreData();
  const superAdmin = await seedSuperAdmin();
  await seedDemoData(superAdmin?.id);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
