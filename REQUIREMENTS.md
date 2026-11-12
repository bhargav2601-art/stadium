# Requirements — Anil Kumble Stadium

## 1. Business & Membership Model
- **Initial Membership Fee:** ₹5,000 (`500000` paise), configurable only by `SUPER_ADMINISTRATOR`.
- **Monthly Renewal Fee:** ₹1,000 (`100000` paise) per 30-day cycle, configurable only by `SUPER_ADMINISTRATOR`.
- **No Usage Fees:** Zero hourly fees, zero per-game charges, zero additional badminton court charges.
- **Access Rule:** Facilities and matchmaking require an `ACTIVE` or `EXPIRING_SOON` membership (`PENDING`, `EXPIRED`, `SUSPENDED`, and `CANCELLED` memberships cannot join games, register for yoga, check in, or join court queues).
- **Non-Disclosure of Unknown Details:** Never invent stadium street address, phone numbers, email addresses, or finalized official hours; render editable `ApplicationSetting` values and keep `FacilitySchedule.provisional = true` until confirmed by management.

## 2. Facilities & Shared-Floor Policy
- **Badminton:** 4 physical courts (`B1`–`B4`), first-come-first-served walk-in allocation.
- **Gym:** Dedicated gym facility with operating/crowd status and member check-in.
- **Table Tennis:** 2 tables (`TT1`–`TT2`) with live status and matchmaking support.
- **Yoga:** Morning-only sessions (enforced server-side in `Asia/Kolkata`) with optional capacity limits and member registration.
- **Basketball Mode:**
  - Members may register basketball interest (`10–15` players target).
  - Never converts automatically.
  - Requires explicit management approval (`basketball.schedule` permission) to publish a scheduled `BasketballSession`, which converts the shared playing floor and sets all 4 badminton courts to `BASKETBALL` status (blocking badminton play during the session) until management ends the session.

## 3. Badminton Matchmaking (Primary Product Feature)
- **Coordination Only:** Online games coordinate players; they **never** reserve physical courts.
- **Game Formats:**
  - `SINGLES`: exact capacity of 2 players.
  - `DOUBLES`: 2, 3, or 4 players (`4` is a full game; minimum `2` to start).
- **Join Modes:** `OPEN` (instant confirmation while slots open) and `APPROVAL` (organizer approves/declines requests).
- **Concurrency & Conflicts:**
  - Database transactions with row-level locking (`SELECT ... FOR UPDATE`) prevent two players from claiming the last slot simultaneously.
  - Prevent overlapping confirmed games for the same player (`slotsOverlap` across date/period/time).
  - Reject games scheduled in the past (`Asia/Kolkata`).
- **Lifecycle, Replacements & Waitlist:**
  - Support `CREATED`, `OPEN`, `FULL`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `INCOMPLETE`, `WAITING_FOR_REPLACEMENT`.
  - Ordered `GameWaitlist` queue with timed offers (`game.offer_minutes`) and automatic expiry cascading to the next waiting player.
- **Attendance & No-Shows:** Staff/organizers can mark `PRESENT` / `ABSENT`; reaching `game.noshow_flag_threshold` increments flags for admin review.

## 4. Roles & Authorization
- `MEMBER`: Profile, membership/payments, availability, matchmaking, court queue, yoga/basketball interest, direct messages, notifications.
- `STAFF`: All member capabilities + official court/table status updates, facility check-in verification, game attendance view, facility issue reporting/updates.
- `ADMINISTRATOR`: All staff capabilities + member/membership management, offline payment verification, facility closures & schedules, yoga & basketball scheduling, announcements, game moderation, reports, staff role management.
- `SUPER_ADMINISTRATOR`: All admin capabilities + pricing updates, critical system settings, admin role assignment, audit log inspection.

## 5. Payments & Notifications
- **Payments:** Razorpay test mode when credentials exist; signed server-side sandbox flow (`SANDBOX_PAYMENT_SECRET`) otherwise; offline counter/UPI reference verification by admins; idempotent webhook processing; generated receipts.
- **Notifications:** Preference-aware in-app notifications (`Notification` + `NotificationPreference`). Do not claim email or WhatsApp delivery unless a real provider is configured and tested.
