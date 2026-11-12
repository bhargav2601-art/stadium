# Database Schema Reference — Anil Kumble Stadium

Engine: PostgreSQL via Prisma 7 (`@prisma/adapter-pg`), generated client at `generated/prisma/`.  
Source of truth: [prisma/schema.prisma](file:///Users/bhargavk/Desktop/anil-kumble-stadium/prisma/schema.prisma).

## Summary of Models (31) & Tables

| Domain | Models (Mapped Table) | Purpose |
| --- | --- | --- |
| Identity & Auth | `User` (`profiles`), `Session` (`sessions`), `PlayerProfile` (`player_profiles`) | Accounts, roles, SHA-256 session tokens, badminton/TT preferences, no-show counts |
| Memberships & Billing | `MembershipPlan` (`membership_plans`), `Membership` (`memberships`), `Payment` (`payments`), `PaymentWebhookEvent` (`payment_webhook_events`) | ₹5,000 initial / ₹1,000 renewal plans, status lifecycle, online/offline/webhook ledger |
| Facilities & Courts | `Facility` (`facilities`), `FacilitySchedule` (`facility_schedules`), `Court` (`courts`), `CourtStatusHistory` (`court_status_history`), `CourtQueueEntry` (`court_queue`), `FacilityCheckIn` (`facility_checkins`), `FacilityReport` (`facility_reports`), `StaffAssignment` (`staff_assignments`) | 5 facilities, 4 badminton courts + 2 TT tables, live status history, walk-in queue, check-ins, issues |
| Matchmaking | `PlayerAvailability` (`player_availability`), `Game` (`games`), `GameParticipant` (`game_participants`), `GameWaitlist` (`game_waitlists`), `GameAttendance` (`game_attendance`) | Slots, singles/doubles games, requests, ordered waitlists, attendance |
| Special Programs | `YogaSession` (`yoga_sessions`), `YogaRegistration` (`yoga_registrations`), `BasketballInterest` (`basketball_interest`), `BasketballSession` (`basketball_sessions`) | Morning yoga capacity/registrations; basketball interest & shared-floor sessions |
| Comms & Moderation | `Notification` (`notifications`), `NotificationPreference` (`notification_preferences`), `Message` (`messages`), `UserBlock` (`user_blocks`), `MemberReport` (`member_reports`) | In-app alerts, mute settings, member DMs, blocks, moderation queue |
| Governance | `AdminAuditLog` (`admin_audit_logs`), `ApplicationSetting` (`application_settings`) | Immutable audit trail & configurable stadium/pricing settings |

## Key Constraints & Indexes
- Unique constraints prevent duplicate signups (`User.email`), double check-ins/waitlists (`GameParticipant(gameId, userId)`, `GameWaitlist(gameId, userId)`, `CourtQueueEntry(facilityId, userId)`), duplicate availability (`PlayerAvailability(userId, date, period, sport)`), and duplicate webhook replay (`PaymentWebhookEvent(provider, providerEventId)`).
- Composite indexes optimize roster/date queries (`Game(date, status, sport)`, `GameWaitlist(gameId, status, position)`, `Notification(userId, readAt, createdAt)`).
