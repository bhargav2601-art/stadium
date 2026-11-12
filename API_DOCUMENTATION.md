# API Documentation — Anil Kumble Stadium

All API route handlers live under `src/app/api/**`, validate inputs with Zod, enforce same-origin checks (`assertSameOrigin`) on cookie-authenticated mutations, enforce RBAC & membership rules server-side (`src/domain/permissions.ts`, `src/server/guards.ts`), and return JSON (`{ error: string }` on 4xx/5xx).

---

## 1. Authentication & Session (`aks_session` HTTP-Only Cookie)
- `POST /api/auth/register`
  - Body: `{ name, email, password (min 8), phone? }`
  - Rate limited per email (`src/server/rate-limit.ts`). Creates `User` (`MEMBER`), `PlayerProfile`, `Membership` (`PENDING`), `NotificationPreference`, and sets signed-random session token cookie backed by SHA-256 hash in `sessions`.
- `POST /api/auth/login`
  - Body: `{ email, password }` -> sets `aks_session` cookie (200) or 401/429.
- `POST /api/auth/logout`
  - Deletes session row in `sessions` and clears `aks_session` cookie.
- `GET /api/auth/me`
  - Returns `{ user }` (nullable safe profile + `membership` + `playerProfile` summary).
- `POST /api/auth/change-password`
  - Auth required. Body: `{ currentPassword, newPassword }` -> verifies scrypt hash, updates password, invalidates all existing sessions.

---

## 2. Profile, Players, Messaging & Moderation
- `GET /api/profile` / `PATCH /api/profile`
  - Auth required. Updates user profile (`name`, `phone`, `bio`) and `PlayerProfile` (`skillLevel`, `preferredGame`, `preferredTime`, `playStyle`, `sports`, `availableNow`, `intro`).
- `POST /api/profile/avatar`
  - Auth required. Accepts sanitized avatar URL/path update (`avatarUrl`).
- `GET /api/players`
  - Auth required. Query filters: `?q=&skill=&sport=&period=&availableNow=`. Returns active/discoverable member profiles respecting user blocks.
- `GET /api/messages` · `POST /api/messages` · `DELETE /api/messages`
  - Auth required (active membership for sending; blocks checked bidirectionally).
- `POST /api/moderation`
  - Auth required. Supports `{ action: "BLOCK" | "UNBLOCK" | "REPORT", targetUserId, reason? }`.

---

## 3. Badminton & Table Tennis Matchmaking
> Matchmaking is **player coordination only** and never reserves physical courts (physical courts remain first-come-first-served).

- `GET /api/availability` · `POST /api/availability` · `DELETE /api/availability`
  - Auth + active membership required for mutations. Declares `(date, period, sport, note?)`.
- `GET /api/games` · `POST /api/games`
  - `POST`: Auth + active membership required. Body: `{ sport: "BADMINTON"|"TABLE_TENNIS", gameType: "SINGLES"|"DOUBLES", date: "YYYY-MM-DD", period: "MORNING"|"EVENING", startTime?, skillLevel?, playStyle?, maxPlayers (2 for Singles; 2–4 for Doubles), joinMode: "OPEN"|"APPROVAL", description? }`.
  - Validates slot is not in the past, not overlapping user's confirmed games, and not conflicting with a published `BASKETBALL` floor conversion.
- `GET /api/games/[id]` · `PATCH /api/games/[id]` · `DELETE /api/games/[id]`
  - `PATCH`: `{ action: "START"|"COMPLETE"|"INCOMPLETE"|"OPEN_REPLACEMENT" }` (Organizer, Staff, or Admin).
  - `DELETE`: Cancels game (`CANCELLED`) and expires pending waitlist entries (Organizer or Admin).
- `POST /api/games/[id]/join`
  - Transactional row-lock (`SELECT ... FOR UPDATE`), checks active membership & overlap, confirms (`OPEN` mode) or sets `REQUESTED` (`APPROVAL` mode).
- `POST /api/games/[id]/leave`
  - Body: `{ needsReplacement?: boolean }`. Marks leaving participant cancelled; sets `WAITING_FOR_REPLACEMENT` if requested; offers slot to `#1` waitlist player when available.
- `POST /api/games/[id]/requests/[participantId]`
  - Organizer or Admin. Body: `{ decision: "APPROVE"|"DECLINE" }`.
- `POST /api/games/[id]/waitlist`
  - Joins waitlist when game is `FULL`.
- `POST /api/games/[id]/waitlist/respond`
  - Body: `{ decision: "ACCEPT"|"DECLINE" }`. Accepts before `offerExpiresAt` (row-locked) or cascades offer to next player on decline/expiry.
- `POST /api/games/[id]/attendance`
  - Organizer, Staff, or Admin. Body: `{ marks: [{ userId, status: "PRESENT"|"ABSENT" }] }`. Updates `noShowCount` and `flaggedForReview` (`>= game.noshow_flag_threshold`).
- `POST /api/cron/reminders`
  - Requires `Authorization: Bearer <CRON_SECRET>`. Expires stale waitlist offers (`cascadedOffers`), sends 2-hour game reminders, and syncs expiring/expired memberships.

---

## 4. Facilities, Walk-In Desk, Yoga & Basketball
- `GET /api/facilities`
  - Returns live facilities, 4 Badminton courts (`B1`–`B4`), 2 Table Tennis tables (`TT1`–`TT2`), `staleMinutes`, walk-in queue, upcoming morning Yoga sessions, and Basketball interest/sessions.
- `PATCH /api/courts/[id]`
  - Requires `courts.update` (`STAFF` / `ADMINISTRATOR` / `SUPER_ADMINISTRATOR`). Body: `{ status: "AVAILABLE"|"OCCUPIED"|"MAINTENANCE"|"TRANSITION"|"BASKETBALL", note? }`.
- `POST /api/facilities/[kind]/queue` · `DELETE /api/facilities/[kind]/queue`
  - Active member walk-in coordination queue.
- `POST /api/facilities/[kind]/reports`
  - Auth required. Logs a `FacilityReport`.
- `POST /api/checkins`
  - Requires `checkin.verify` (`STAFF` / `ADMIN`). Body: `{ memberId, facilityKind, courtId?, action: "IN"|"OUT" }`.
- `GET /api/yoga` · `POST /api/yoga`
  - `POST` requires `yoga.manage` (`ADMIN`). Enforces morning-only schedule (`05:00–12:00` IST).
- `POST /api/yoga/[id]/register` · `DELETE /api/yoga/[id]/register`
  - Active member registration with transactional capacity lock (`SELECT ... FOR UPDATE`).
- `GET /api/basketball/interest` · `POST /api/basketball/interest` · `DELETE /api/basketball/interest`
  - Active member interest tracking (10–15 player target). Never triggers conversion automatically.
- `GET /api/basketball/sessions` · `POST /api/basketball/sessions` · `PATCH /api/basketball/sessions`
  - `POST`/`PATCH` require `basketball.schedule` (`ADMIN`). Publishing converts all 4 Badminton courts to `BASKETBALL` and notifies active members; `END` restores Badminton courts to `AVAILABLE`.

---

## 5. Payments, Receipts & Notifications
- `POST /api/payments/orders`
  - Auth required. Determines server-side purpose (`INITIAL` ₹5,000 vs `RENEWAL` ₹1,000 from settings/plans). Uses Razorpay Orders API when `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` are configured, or HMAC-signed Sandbox mode otherwise.
- `POST /api/payments/verify`
  - Auth required. Body: `{ orderId, paymentId, signature }`. Constant-time HMAC verification -> `PAID`, `AKS-...` receipt number, and membership extension inside locked transaction.
- `POST /api/payments/offline`
  - Auth required. Body: `{ reference }`. Creates `PENDING_VERIFICATION` offline payment and notifies admins.
- `POST /api/payments/webhook`
  - Raw-body HMAC verification (`x-razorpay-signature` or `x-sandbox-signature`), idempotent deduplication in `payment_webhook_events`.
- `GET /api/notifications` · `POST /api/notifications` · `PATCH /api/notifications/preferences`
  - Fetch unread/recent in-app notifications, mark one/all read, or update in-app/muted notification preferences.

---

## 6. Staff & Admin Endpoints
- `PATCH /api/staff/reports/[id]` — Requires `issues.report` (`STAFF` / `ADMIN`). Body: `{ status: "OPEN"|"ACKNOWLEDGED"|"RESOLVED" }`.
- `PATCH /api/admin/members/[id]` — Requires `members.manage`; role escalation further bounded by `canAssignRole` hierarchy (`ADMINISTRATOR` cannot modify/promote `ADMINISTRATOR` or `SUPER_ADMINISTRATOR`).
- `POST /api/admin/payments/[id]` — Requires `payments.verify` (`ADMIN`). Body: `{ decision: "APPROVE"|"REJECT", reason? }`.
- `PATCH /api/admin/facilities/[kind]` — Requires `facilities.manage` (`ADMIN`). Closure / crowd note + broadcast notification.
- `POST /api/admin/announcements` — Requires `announcements.send` (`ADMIN`). Broadcasts in-app announcement.
- `PATCH /api/admin/moderation/[id]` — Requires `reports.view` (`ADMIN`). Updates `MemberReport` status.
- `PATCH /api/admin/settings` — Strictly requires `settings.critical` (`SUPER_ADMINISTRATOR`). Updates `ApplicationSetting` & syncs `MembershipPlan` prices.
- `POST /api/admin/staff-assignments` — Requires `staff.manage` (`ADMIN`). Assigns or removes staff members on facilities.
