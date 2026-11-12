# Antigravity Handover — Anil Kumble Stadium

**Audit Date:** 2026-11-12  
**Project Directory:** `/Users/bhargavk/Desktop/anil-kumble-stadium`  
**Status at Handover:** Core domain model, Prisma schema, generated Prisma client, and foundational auth/membership/settings utilities exist. No Next.js pages, UI components, API routes, migrations, seed script, ESLint config, or tests exist yet.

---

## 1. Repository Inventory (Verified)

### Root Configuration
- `package.json`: Next.js `16.4.6`, React `19.3.1` (`^19.2.0`), TypeScript `^5.9.3`, Tailwind CSS `4.3.5` (`@tailwindcss/postcss`), Prisma `7.10.1` (`@prisma/client`, `@prisma/adapter-pg`, `pg`), `zod` (`4.6.7`), `lucide-react` (`0.554.0`), `eslint` (`9.39.5`), `eslint-config-next` (`16.4.6`), `vitest` (`4.1.12`), `tsx` (`^4.20.6`).
- `next.config.ts`: Sets `poweredByHeader: false` and security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`).
- `tsconfig.json`: `strict: true`, `@/*` alias mapped to `./src/*`, includes `generated/**/*.ts`.
- `postcss.config.mjs`: Configures `@tailwindcss/postcss`.
- `prisma.config.ts`: Points to `prisma/schema.prisma`, `prisma/migrations`, seed command `tsx prisma/seed.ts`, and `DATABASE_URL`.
- `.env` / `.env.example`:
  - Configured in `.env`: `DATABASE_URL`, `TEST_DATABASE_URL`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_DEMO_DATA`, `SEED_DEMO_PASSWORD`, `SANDBOX_PAYMENT_SECRET`, `CRON_SECRET`, `APP_URL`, `SUPABASE_STORAGE_BUCKET`.
  - Blank in `.env`: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- `.gitignore`: Excludes `node_modules`, `.next`, `generated`, `public/uploads/*` (preserving `.gitkeep`), `.env`, logs, coverage, Playwright artifacts.
- `public/uploads/.gitkeep`: Upload directory placeholder.
- Note: Git is not initialized in the repository.

### Database Layer
- `prisma/schema.prisma`: 675 lines defining **22 enums** and **31 models** covering users/sessions, player profiles, membership plans/memberships/payments/webhooks, facilities/schedules/courts/status history/queue/check-ins/reports/staff assignments, availability/games/participants/waitlist/attendance, yoga/basketball, notifications/preferences, messaging/blocks/moderation, application settings, and admin audit logs.
- `generated/prisma/`: Generated Prisma 7 client (`client.ts`, `enums.ts`, `models.ts`, `commonInputTypes.ts`, `internal/`, `models/`).

### Domain Modules (`src/domain/`)
- `src/domain/game-state.ts`: Game status machine (`CREATED`, `OPEN`, `FULL`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `INCOMPLETE`, `WAITING_FOR_REPLACEMENT`), roster caps (singles = 2, doubles = 2–4), start eligibility, `statusAfterRosterChange`, `openSlots`.
- `src/domain/membership.ts`: `resolveMembershipStatus` (handling `EXPIRING_SOON` and `graceDays`), `canUseFacilities`, `paymentPurpose`, `extendExpiry`.
- `src/domain/overlap.ts`: `slotsOverlap` detecting conflicts across date, `MORNING`/`EVENING` period, and optional `startTime`/`durationMin`.
- `src/domain/payments.ts`: HMAC-SHA256 signing and constant-time (`timingSafeEqual`) order and webhook signature verification.
- `src/domain/permissions.ts`: 18 granular actions mapped across `MEMBER`, `STAFF`, `ADMINISTRATOR`, `SUPER_ADMINISTRATOR`, plus `canAssignRole` hierarchy guard.
- `src/domain/staleness.ts`: `isStatusStale` threshold helper.
- `src/domain/text.ts`: `cleanText` HTML-angle stripping/whitespace normalization and `safeNextPath` open-redirect guard.
- `src/domain/time.ts`: `Asia/Kolkata` date/time utilities (`kolkataParts`, `isoDate`, `dateFromIso`, `addDays`, `isSlotInPast`, `scheduledStart`).

### Library & Server Utilities (`src/lib/`, `src/server/`)
- `src/lib/db.ts`: Singleton `PrismaClient` using `PrismaPg` adapter + exported `Db` and `Tx` types.
- `src/lib/format.ts`: `formatInr`, `formatWhen` (`Asia/Kolkata`), `formatDay` (`UTC`), `titleCase`.
- `src/server/auth.ts`: `registerAccount`, `authenticate`, `startSession`, `userForToken`, `endSession`, `changePassword`.
- `src/server/passwords.ts`: Node `crypto.scrypt` (random 16-byte hex salt, 64-byte derived key) + `timingSafeEqual`.
- `src/server/rate-limit.ts`: In-memory fixed-window bucket limiter (`rateLimit`, `resetRateLimits`).
- `src/server/membership.ts`: `syncMembership`, `requirePlayableMembership`, `activateMembership`, `purposeFor`.
- `src/server/settings.ts`: `SETTING_DEFAULTS`, `ensureSettings`, `getSettings`, `updateSettings`.
- `src/server/notifications.ts`: Preference-filtered `notifyUsers` and `notifyAdmins`.
- `src/server/audit.ts`: `audit` writer for `AdminAuditLog`.
- `src/server/errors.ts`: `AppError`, `AuthError`, `ForbiddenError`, `publicError`.

---

## 2. Verification Findings at Handover

- **TypeScript (`pnpm typecheck`):** Passed (`0` errors).
- **ESLint (`pnpm lint`):** Failed (exit `2`) — ESLint 9 is installed without `eslint.config.(js|mjs|cjs)`.
- **Vitest (`pnpm test`):** Failed (exit `1`) — No test files exist yet.
- **PostgreSQL (`localhost:5432`):**
  - Running on the host (`pg_isready` returned `accepting connections`), though sandboxed shells block TCP connections to `localhost:5432` unless explicitly permitted.
  - Both `anil_kumble` and `anil_kumble_test` databases exist and currently have zero tables (`No migration found in prisma/migrations`).

---

## 3. Defects & Potential Security Issues Identified in Audit

1. **Bug in `scheduledStart` (`src/domain/time.ts`):**
   - Verified with `tsx`: `scheduledStart("2026-11-12", "19:00", "EVENING")` returns `2026-11-13T13:30:00.000Z` (**one day in the future**).
   - Root cause: `utcGuess` at `19:00 UTC` corresponds to `00:30` the next day in `Asia/Kolkata`, and the `delta = targetMinutes - parts.minutes` calculation ignores the calendar date rollover for any time `>= 18:30` IST.
   - Impact: Evening game grace windows and reminder scheduling would shift +24 hours.
2. **Hardcoded `soonDays` in `activateMembership` (`src/server/membership.ts`):**
   - `activateMembership` passes `soonDays: 7` instead of reading `settings["membership.expiry_soon_days"]`.
3. **Unbounded Map Growth in `rateLimit` (`src/server/rate-limit.ts`):**
   - `buckets` never sweeps expired keys. In addition, in-memory rate limiting is process-local (must be documented for multi-instance serverless deployments and keyed by IP + identifier where appropriate).
4. **Auth Rate Limiting & Timing (`src/server/auth.ts`):**
   - Login/registration rate limits key only by email (allowing per-IP credential stuffing across many accounts if API layer doesn't also rate-limit by client IP).
   - Unknown-user dummy timing path runs `hashPassword("dummy-timing")` before `verifyPassword` (2x `scrypt` work vs 1x for existing user); a precomputed dummy hash equalizes work cleanly.
5. **Transaction Context in `notifyUsers` (`src/server/notifications.ts`):**
   - Currently binds directly to global `prisma` rather than accepting an optional `tx` client.
6. **Open Redirect & Control Characters (`src/domain/text.ts`):**
   - `safeNextPath` should also reject control characters / whitespace injection (`[\r\n\t\0]`).
7. **Missing HTTP Security & Cookie Layer:**
   - No cookie helper (`httpOnly`, `sameSite: "lax"`, `secure` in production), CSRF origin check on mutating API routes if needed, or Zod request-body validation wrapper yet.

---

## 4. What Is Incomplete

- Phase 1: ESLint 9 config, domain bug fixes, Vitest setup & initial unit tests.
- Phase 2: Initial Prisma migration (`prisma/migrations/`) and `prisma/seed.ts`.
- Phase 3: Cookie/session helpers, server authorization guards, auth API routes, login/register UI.
- Phases 4–10: Full stadium design system, public site, member portal, transactional badminton matchmaking & waitlist/attendance/reminders, facility & shared-floor basketball/yoga management, staff/admin dashboards, Razorpay test + signed sandbox payments & notifications.
- Phases 11–12: Comprehensive unit/integration/E2E tests, production build verification, deployment guide.

---

## 5. Architecture Decisions

- **Preserve Cursor Architecture:** Retain Next.js 16 App Router, React 19, Prisma 7 (`@prisma/adapter-pg` outputting to `generated/prisma`), pure `src/domain/` business logic, and `src/server/` service modules.
- **Database Integrity & Concurrency:** Critical roster mutations (joining final game slots, waitlist offers/promotions, capacity-capped yoga registrations, shared-floor basketball conversion, idempotent payment verification) will execute inside `prisma.$transaction` using row-level `SELECT ... FOR UPDATE` locks where contention can happen.
- **Badminton Operating Model:** Online games coordinate players only and never reserve physical courts (`Court` status represents physical floor truth updated solely by authorized staff/admins).
- **Payments Architecture:** Support real Razorpay test-mode server order creation + signature/webhook verification when `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET` are configured, falling back to the server-signed sandbox flow (`SANDBOX_PAYMENT_SECRET`) plus offline payment verification workflow when Razorpay keys are blank. Never accept client-supplied amounts.

---

## 6. Files That Must Be Preserved

All existing files from the Cursor foundation must be preserved (with surgical fixes only where defects were identified):
- `prisma/schema.prisma`, `prisma.config.ts`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `.env.example`, `.gitignore`
- `src/domain/*` (8 files)
- `src/lib/*` (2 files)
- `src/server/*` (8 files)

---

## 7. Implementation Order

1. **Phase 1:** ESLint 9 config, fix `scheduledStart` & minor server/domain hardening, Vitest setup + initial unit tests.
2. **Phase 2:** Initial Prisma migration (`anil_kumble` & `anil_kumble_test`) and `prisma/seed.ts`.
3. **Phase 3:** HTTP session cookies, auth guards, `/api/auth/*` endpoints, `/login` & `/register`.
4. **Phase 4:** Stadium design system, typography, CSS tokens, reusable UI components, navigation shell.
5. **Phase 5:** Public stadium website (`/`, `/about`, `/facilities/*`, `/membership`, `/contact`).
6. **Phase 6:** Member portal (`/portal/*`: dashboard, profile, membership/receipts, notifications, facilities, find players, availability, messages).
7. **Phase 7:** Transactional badminton matchmaking, availability, waitlist, replacements, attendance, no-shows, reminders cron.
8. **Phase 8:** Facility statuses, walk-in queue, morning-only yoga, basketball interest & manual shared-floor conversion.
9. **Phase 9:** Staff (`/staff/*`) and Admin (`/admin/*`) dashboards & audit logs.
10. **Phase 10:** Razorpay test + signed sandbox checkout, webhooks, offline payment verification, receipts, in-app notifications.
11. **Phase 11:** Full unit + PostgreSQL concurrency/integration tests, lint, typecheck, production build verification.
12. **Phase 12:** Deployment documentation & production readiness checklist.
