-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MEMBER', 'STAFF', 'ADMINISTRATOR', 'SUPER_ADMINISTRATOR');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('INITIAL', 'RENEWAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PENDING_VERIFICATION', 'PAID', 'FAILED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "PlayStyle" AS ENUM ('CASUAL', 'COMPETITIVE');

-- CreateEnum
CREATE TYPE "PreferredTime" AS ENUM ('MORNING', 'EVENING', 'BOTH');

-- CreateEnum
CREATE TYPE "Sport" AS ENUM ('BADMINTON', 'TABLE_TENNIS');

-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('SINGLES', 'DOUBLES');

-- CreateEnum
CREATE TYPE "JoinMode" AS ENUM ('OPEN', 'APPROVAL');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('CREATED', 'OPEN', 'FULL', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'INCOMPLETE', 'WAITING_FOR_REPLACEMENT');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('CONFIRMED', 'REQUESTED', 'DECLINED', 'CANCELLED', 'NO_SHOW', 'REPLACED');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'OFFERED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'PROMOTED');

-- CreateEnum
CREATE TYPE "AttendanceMark" AS ENUM ('PRESENT', 'ABSENT');

-- CreateEnum
CREATE TYPE "CourtStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'TRANSITION', 'BASKETBALL');

-- CreateEnum
CREATE TYPE "FacilityKind" AS ENUM ('BADMINTON', 'GYM', 'TABLE_TENNIS', 'YOGA', 'BASKETBALL');

-- CreateEnum
CREATE TYPE "SessionPeriod" AS ENUM ('MORNING', 'EVENING');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('GAME_INVITATION', 'GAME_JOIN_REQUEST', 'JOIN_REQUEST_APPROVED', 'JOIN_REQUEST_DECLINED', 'PLAYER_JOINED', 'GAME_FULL', 'GAME_CANCELLED', 'PLAYER_CANCELLED', 'REPLACEMENT_NEEDED', 'WAITLIST_OFFER', 'GAME_REMINDER', 'MEMBERSHIP_EXPIRY', 'PAYMENT_CONFIRMATION', 'PAYMENT_VERIFICATION', 'YOGA_ANNOUNCEMENT', 'BASKETBALL_INTEREST', 'BASKETBALL_SCHEDULED', 'FACILITY_CLOSURE', 'STADIUM_ANNOUNCEMENT', 'MESSAGE');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED');

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillLevel" "SkillLevel" NOT NULL DEFAULT 'BEGINNER',
    "preferredGame" "GameType",
    "preferredTime" "PreferredTime" NOT NULL DEFAULT 'BOTH',
    "playStyle" "PlayStyle" NOT NULL DEFAULT 'CASUAL',
    "sports" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "availableNow" BOOLEAN NOT NULL DEFAULT false,
    "intro" TEXT,
    "noShowCount" INTEGER NOT NULL DEFAULT 0,
    "flaggedForReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "intervalDays" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "purpose" "PaymentPurpose" NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "provider" TEXT NOT NULL,
    "providerOrderId" TEXT,
    "providerPaymentId" TEXT,
    "offlineReference" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "receiptNumber" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" TEXT NOT NULL,
    "kind" "FacilityKind" NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "closedReason" TEXT,
    "crowdLevel" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_schedules" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "period" "SessionPeriod" NOT NULL,
    "opensAt" TEXT NOT NULL,
    "closesAt" TEXT NOT NULL,
    "provisional" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "facility_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courts" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "CourtStatus" NOT NULL DEFAULT 'AVAILABLE',
    "statusNote" TEXT,
    "updatedById" TEXT,
    "statusUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "court_status_history" (
    "id" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "status" "CourtStatus" NOT NULL,
    "note" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "court_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "court_queue" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "court_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_checkins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "courtId" TEXT,
    "verifiedById" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedOutAt" TIMESTAMP(3),

    CONSTRAINT "facility_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_availability" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "period" "SessionPeriod" NOT NULL,
    "sport" "Sport" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "sport" "Sport" NOT NULL,
    "gameType" "GameType" NOT NULL,
    "date" DATE NOT NULL,
    "period" "SessionPeriod" NOT NULL,
    "startTime" TEXT,
    "skillLevel" "SkillLevel",
    "playStyle" "PlayStyle",
    "maxPlayers" INTEGER NOT NULL,
    "joinMode" "JoinMode" NOT NULL DEFAULT 'OPEN',
    "status" "GameStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT,
    "organizerId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "graceMinutes" INTEGER NOT NULL DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_participants" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ParticipantStatus" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_waitlists" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "offeredAt" TIMESTAMP(3),
    "offerExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_waitlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_attendance" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AttendanceMark" NOT NULL,
    "markedById" TEXT NOT NULL,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yoga_sessions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER,
    "notes" TEXT,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yoga_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yoga_registrations" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "yoga_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "basketball_interest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "basketball_interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "basketball_sessions" (
    "id" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "endedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "basketball_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inApp" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT false,
    "mutedTypes" "NotificationType"[] DEFAULT ARRAY[]::"NotificationType"[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_reports" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "courtId" TEXT,
    "reportedById" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facility_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_blocks" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ModerationStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "profiles_role_idx" ON "profiles"("role");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "player_profiles_userId_key" ON "player_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "membership_plans_code_key" ON "membership_plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_userId_key" ON "memberships"("userId");

-- CreateIndex
CREATE INDEX "memberships_status_expiresAt_idx" ON "memberships"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "payments_providerOrderId_key" ON "payments"("providerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_providerPaymentId_key" ON "payments"("providerPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receiptNumber_key" ON "payments"("receiptNumber");

-- CreateIndex
CREATE INDEX "payments_userId_status_idx" ON "payments"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_webhook_events_provider_providerEventId_key" ON "payment_webhook_events"("provider", "providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_kind_key" ON "facilities"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "facility_schedules_facilityId_dayOfWeek_period_key" ON "facility_schedules"("facilityId", "dayOfWeek", "period");

-- CreateIndex
CREATE UNIQUE INDEX "courts_facilityId_code_key" ON "courts"("facilityId", "code");

-- CreateIndex
CREATE INDEX "court_status_history_courtId_createdAt_idx" ON "court_status_history"("courtId", "createdAt");

-- CreateIndex
CREATE INDEX "court_queue_facilityId_createdAt_idx" ON "court_queue"("facilityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "court_queue_facilityId_userId_key" ON "court_queue"("facilityId", "userId");

-- CreateIndex
CREATE INDEX "facility_checkins_facilityId_checkedInAt_idx" ON "facility_checkins"("facilityId", "checkedInAt");

-- CreateIndex
CREATE INDEX "facility_checkins_userId_checkedInAt_idx" ON "facility_checkins"("userId", "checkedInAt");

-- CreateIndex
CREATE INDEX "player_availability_date_period_sport_idx" ON "player_availability"("date", "period", "sport");

-- CreateIndex
CREATE UNIQUE INDEX "player_availability_userId_date_period_sport_key" ON "player_availability"("userId", "date", "period", "sport");

-- CreateIndex
CREATE INDEX "games_date_status_sport_idx" ON "games"("date", "status", "sport");

-- CreateIndex
CREATE INDEX "games_organizerId_idx" ON "games"("organizerId");

-- CreateIndex
CREATE INDEX "game_participants_userId_status_idx" ON "game_participants"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "game_participants_gameId_userId_key" ON "game_participants"("gameId", "userId");

-- CreateIndex
CREATE INDEX "game_waitlists_gameId_status_position_idx" ON "game_waitlists"("gameId", "status", "position");

-- CreateIndex
CREATE UNIQUE INDEX "game_waitlists_gameId_userId_key" ON "game_waitlists"("gameId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "game_attendance_gameId_userId_key" ON "game_attendance"("gameId", "userId");

-- CreateIndex
CREATE INDEX "yoga_sessions_startsAt_idx" ON "yoga_sessions"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "yoga_registrations_sessionId_userId_key" ON "yoga_registrations"("sessionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "basketball_interest_userId_key" ON "basketball_interest"("userId");

-- CreateIndex
CREATE INDEX "basketball_sessions_startsAt_idx" ON "basketball_sessions"("startsAt");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_createdAt_idx" ON "notifications"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");

-- CreateIndex
CREATE INDEX "facility_reports_status_idx" ON "facility_reports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "staff_assignments_userId_facilityId_key" ON "staff_assignments"("userId", "facilityId");

-- CreateIndex
CREATE INDEX "admin_audit_logs_createdAt_idx" ON "admin_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_logs_entity_entityId_idx" ON "admin_audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "messages_recipientId_createdAt_idx" ON "messages"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_senderId_createdAt_idx" ON "messages"("senderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_blocks_blockerId_blockedId_key" ON "user_blocks"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "member_reports_status_idx" ON "member_reports"("status");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_profiles" ADD CONSTRAINT "player_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_schedules" ADD CONSTRAINT "facility_schedules_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courts" ADD CONSTRAINT "courts_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_status_history" ADD CONSTRAINT "court_status_history_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_status_history" ADD CONSTRAINT "court_status_history_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_queue" ADD CONSTRAINT "court_queue_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_queue" ADD CONSTRAINT "court_queue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_checkins" ADD CONSTRAINT "facility_checkins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_checkins" ADD CONSTRAINT "facility_checkins_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_checkins" ADD CONSTRAINT "facility_checkins_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_availability" ADD CONSTRAINT "player_availability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_participants" ADD CONSTRAINT "game_participants_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_participants" ADD CONSTRAINT "game_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_waitlists" ADD CONSTRAINT "game_waitlists_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_waitlists" ADD CONSTRAINT "game_waitlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_attendance" ADD CONSTRAINT "game_attendance_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_attendance" ADD CONSTRAINT "game_attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_attendance" ADD CONSTRAINT "game_attendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yoga_sessions" ADD CONSTRAINT "yoga_sessions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yoga_registrations" ADD CONSTRAINT "yoga_registrations_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "yoga_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yoga_registrations" ADD CONSTRAINT "yoga_registrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "basketball_interest" ADD CONSTRAINT "basketball_interest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "basketball_sessions" ADD CONSTRAINT "basketball_sessions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_reports" ADD CONSTRAINT "facility_reports_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_reports" ADD CONSTRAINT "facility_reports_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_reports" ADD CONSTRAINT "member_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_reports" ADD CONSTRAINT "member_reports_reportedId_fkey" FOREIGN KEY ("reportedId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
