# Changelog — Anil Kumble Stadium

## [Unreleased]

### Phases 6–12 – Member Portal, Matchmaking UI, Staff/Admin Dashboards, Integration Tests & Docs (2026-11-12)
- Completed full Member Portal UI (`/portal`, `/portal/profile`, `/portal/membership`, `/portal/receipts/[id]`, `/portal/notifications`, `/portal/availability`, `/portal/find-players`, `/portal/messages`, `/portal/facilities`, `/portal/games`, `/portal/games/[id]`) and all supporting API endpoints (`src/server/games.ts`, `src/server/facilities.ts`, `src/server/payments.ts`, `src/server/profile.ts`).
- Built Staff Operations Portal (`/staff`, `/staff/courts`, `/staff/checkins`, `/staff/attendance`, `/staff/issues`) with court staleness badges driven by `facility.stale_minutes` and server-side RBAC enforcement.
- Built Admin & Super-Admin Portal (`/admin`, `/admin/members`, `/admin/payments`, `/admin/games`, `/admin/facilities`, `/admin/yoga`, `/admin/basketball`, `/admin/reports`, `/admin/settings`) supporting offline payment approvals, morning-only Yoga scheduling, manual Basketball shared-floor conversion/restoration, announcements, moderation, Super-Admin critical settings, and audit log viewing.
- Configured `outputFileTracingRoot`/`turbopack.root` in `next.config.ts` and `next build --webpack` in `package.json` for deterministic production builds.
- Added PostgreSQL integration and concurrency test suite (`tests/integration/stadium.test.ts`); verified `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test` (`3` test files, `18` tests passed).
- Finalized `API_DOCUMENTATION.md`, `TESTING.md`, `DEPLOYMENT.md`, and `PROJECT_PLAN.md`.

### Phases 3–5 – Auth Endpoints, Design System & Public Website (2026-11-12)
- Implemented HTTP-only session cookie helpers (`src/server/session-cookie.ts`), DB-backed role/membership guards (`src/server/guards.ts`), and `/api/auth/*` endpoints (`register`, `login`, `logout`, `me`, `change-password`).
- Consulted `modern-web-guidance` (`dialog`, `accessibility`, `forms`, `navigation-drawer`) and built the Navy/Stadium Blue/Electric Lime design system (`src/app/globals.css`), native `<dialog>` modals/drawers, skip links, and reusable UI primitives (`src/components/ui/*`, `src/components/layout/*`).
- Built all public stadium pages (`/`, `/about`, `/facilities`, `/facilities/badminton`, `/facilities/gym`, `/facilities/table-tennis`, `/facilities/yoga`, `/facilities/basketball`, `/membership`, `/contact`, `/login`, `/register`) with bespoke generated facility photography (`public/images/*`).

### Phase 2 – Database & Seed (2026-11-12)
- Created and applied initial Prisma migration `20261111195204_init` to both `anil_kumble` and `anil_kumble_test`.
- Implemented idempotent `prisma/seed.ts` seeding `ApplicationSetting`, `MembershipPlan` (`INITIAL` ₹5,000, `MONTHLY_RENEWAL` ₹1,000), 5 `Facility` records, 4 badminton `Court` records (`B1`–`B4`), 2 table tennis `Court` records (`TT1`–`TT2`), provisional `FacilitySchedule` records (including morning-only `YOGA`), env-driven `SUPER_ADMINISTRATOR`, and guarded development demo data.

### Phase 1 – Repair the Foundation (2026-11-12)
- Added ESLint 9 flat configuration (`eslint.config.mjs`) using `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.
- Fixed evening date rollover bug in `scheduledStart` (`src/domain/time.ts`) for times `>= 18:30` IST.
- Hardened `safeNextPath` (`src/domain/text.ts`), added expired-bucket eviction in `rateLimit` (`src/server/rate-limit.ts`), equalized unknown-user password timing and email format check in `src/server/auth.ts`, read `membership.expiry_soon_days` dynamically in `activateMembership` (`src/server/membership.ts`), and added optional transaction client support to `notifyUsers`/`notifyAdmins` (`src/server/notifications.ts`).
- Configured Vitest (`vitest.config.mts`) and added 14 passing unit tests (`src/domain/domain.test.ts`, `src/server/foundation.test.ts`).

### Phase 0 – Full Project Audit (2026-11-12)
- Completed full audit of existing Cursor codebase (`prisma/schema.prisma`, `src/domain/*`, `src/server/*`, `src/lib/*`, configuration, and environment setup).
- Verified `pnpm typecheck` passes and PostgreSQL `anil_kumble` / `anil_kumble_test` are reachable (currently empty, no migrations applied).
- Identified bugs and gaps (`scheduledStart` evening date rollover bug in `src/domain/time.ts`, missing `eslint.config.mjs`, missing Vitest tests, missing migrations/seed, missing App Router/API/UI layers).
- Created `ANTIGRAVITY_HANDOVER.md`, `PROJECT_PLAN.md`, `REQUIREMENTS.md`, `DATABASE_SCHEMA.md`, `SECURITY.md`, `API_DOCUMENTATION.md`, `TESTING.md`, `DEPLOYMENT.md`, and `CHANGELOG.md`.
