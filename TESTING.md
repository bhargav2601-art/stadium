# Testing Strategy & Results — Anil Kumble Stadium

## Tooling
- **Runner:** Vitest (`pnpm test` → `vitest run`)
- **Static Checks:** `pnpm typecheck` (`tsc --noEmit`), `pnpm lint` (`eslint .`)
- **Build Verification:** `pnpm build` (`next build --webpack`)

## Test Suites
1. **Domain Unit Tests (`src/domain/domain.test.ts` — 11 tests):**
   - Game capacity & transition state machine (`assertMaxPlayers`, `assertTransition`, `canStartGame`, `statusAfterRosterChange`)
   - Membership pricing purpose, expiry & grace status resolution (`paymentPurpose`, `resolveMembershipStatus`, `extendExpiry`)
   - Slot overlap detection (`slotsOverlap`) across Morning/Evening and timed starts
   - Kolkata time-slot checks including evening `>= 18:30` IST scheduling (`isSlotInPast`, `scheduledStart`)
   - Role capability matrix & strict rank hierarchy (`can`, `canAssignRole`)
   - Constant-time HMAC payment signature verification (`signOrderPayment`, `verifyOrderSignature`, `verifyWebhookSignature`)
   - Court status staleness threshold (`isStatusStale`)
   - Sanitization & open-redirect protection (`cleanText`, `safeNextPath`)
2. **Server Foundation Tests (`src/server/foundation.test.ts` — 3 tests):**
   - `scrypt` password hashing and verification (`hashPassword`, `verifyPassword`)
   - Rate-limiting fixed window enforcement & reset (`rateLimit`, `resetRateLimits`)
   - Public error redaction (`publicError`)
3. **PostgreSQL Integration & Concurrency Tests (`tests/integration/stadium.test.ts` — 4 suites):**
   - Runs directly against `TEST_DATABASE_URL` (`anil_kumble_test`) after resetting tables via `TRUNCATE ... CASCADE`:
     1. Account registration, authentication (`authenticate`), hashed session token lifecycle (`startSession`, `userForToken`), and session revocation on `changePassword`.
     2. Server-enforced membership pricing (₹5,000 `INITIAL`, ₹1,000 `RENEWAL`), invalid payment signature rejection, receipt issuance (`AKS-...`), webhook HMAC verification & replay idempotency (`payment_webhook_events`), admin offline verification + audit log, and membership expiry enforcement (`syncMembership`).
     3. Overlap prevention (`slotsOverlap`), concurrent last-slot `joinGame` race under PostgreSQL `SELECT ... FOR UPDATE` row locking (strictly 1 succeeds, 1 rejected), `APPROVAL` mode request workflow, waitlist queueing, replacement abandonment + `processGameRemindersAndExpiries` expired-offer cascade to `#2` player, and no-show flagging (`noShowCount >= 3` -> `flaggedForReview`).
     4. Role enforcement (`MEMBER` blocked from `updateCourtStatus`, `STAFF` blocked from `createYogaSession`, `verifyOfflinePayment`, and `scheduleBasketballSession`), cross-origin request rejection (`assertSameOrigin`), morning-only yoga enforcement & capacity limit, and explicit admin basketball floor conversion (all 4 badminton courts set to `BASKETBALL`) + restoration (`AVAILABLE`).

## Verification Log (2026-11-12)
- `pnpm lint` (`eslint .`) → **Passed** (`0` errors)
- `pnpm typecheck` (`tsc --noEmit`) → **Passed** (`0` errors)
- `pnpm build` (`next build --webpack`) → **Passed** (compiled app routes & API endpoints cleanly; configured with `--webpack` in `package.json` because Next 16.4.6 Turbopack panicked spawning the PostCSS Node worker on `/src/app/globals.css`)
- `pnpm test` (`vitest run` against `anil_kumble_test`) → **Passed** (`3` test files passed, `18` / `18` tests passed)
