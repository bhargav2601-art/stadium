# Deployment Guide — Anil Kumble Stadium

This guide covers deploying the Next.js 16 + Prisma 7 + PostgreSQL application to production (Vercel + managed PostgreSQL).

> **Important Note:** Live cloud deployment has **not** been executed in this workspace. Do not mark a production environment live until all steps below are executed and verified against your hosting provider.

---

## 1. Prerequisites
- **PostgreSQL 16+** database with SSL enabled (`sslmode=require` recommended for hosted providers).
- **Node.js 20+** and **pnpm 9+** (configured automatically on Vercel when `pnpm-lock.yaml` is committed).
- Optional **Razorpay Test / Live Credentials** (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`). Without Razorpay keys, online checkout operates in HMAC-signed server sandbox mode for local verification.

---

## 2. Required Production Environment Variables
Set these in Vercel Project Settings -> Environment Variables (see `.env.example`):

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Pooled or direct production PostgreSQL connection string (SSL enabled) |
| `DIRECT_URL` | Direct non-pooled Postgres URL (recommended for Prisma migrations on PgBouncer/Neon/Supabase hosts) |
| `APP_URL` | Canonical HTTPS URL (e.g. `https://anilkumblestadium.example.com`) |
| `CRON_SECRET` | High-entropy random secret (`openssl rand -hex 32`) authorizing `POST /api/cron/reminders` |
| `SANDBOX_PAYMENT_SECRET` | High-entropy random secret (`openssl rand -hex 32`); do not leave empty |
| `RAZORPAY_KEY_ID` | Razorpay Key ID (set for real Razorpay checkout) |
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Webhook Secret configured in Razorpay Dashboard |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Public Razorpay Key ID (matches `RAZORPAY_KEY_ID`) |
| `SEED_ADMIN_EMAIL` | Initial Super Administrator login email (bootstrap only) |
| `SEED_ADMIN_PASSWORD` | Strong unique password (bootstrap only — rotate after first login if needed) |
| `SEED_DEMO_DATA` | **Must be `"false"`** (or unset) in production |

---

## 3. Database Migration & Initial Bootstrap
Run migrations against the production database **before** switching traffic:

```bash
pnpm exec prisma generate
pnpm exec prisma migrate deploy
SEED_DEMO_DATA=false pnpm db:seed
```

Verify after bootstrap:
- 5 `facilities` (`BADMINTON`, `TABLE_TENNIS`, `GYM`, `YOGA`, `BASKETBALL`) exist
- 4 badminton courts (`B1`–`B4`) and 2 table tennis tables (`TT1`–`TT2`) exist
- `INITIAL` (`500000` paise / ₹5,000) and `MONTHLY_RENEWAL` (`100000` paise / ₹1,000) plans exist
- Public operating hours and contact metadata in `application_settings` are reviewed and updated via **Admin -> Settings & Audit** by the `SUPER_ADMINISTRATOR` (never invent placeholder hours/phone/address in production).

---

## 4. Vercel Deployment & Domain / HTTPS
1. Connect the repository to **Vercel** (Framework Preset: **Next.js**).
2. Confirm Build Command is `pnpm build` (note `postinstall` runs `prisma generate`).
3. Add your custom domain in **Vercel -> Project Settings -> Domains** and verify DNS (`A` / `CNAME`) records. Vercel provisions and renews TLS/HTTPS certificates automatically.
4. Security headers in `next.config.ts` (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Strict-Transport-Security` over HTTPS) and `SameSite=Lax; HttpOnly; Secure` session cookies take effect automatically in production (`NODE_ENV === "production"`).

---

## 5. Webhooks & Scheduled Jobs
### Razorpay Webhook
- In Razorpay Dashboard -> Webhooks, add endpoint:
  `https://<your-domain>/api/payments/webhook`
- Subscribe to `payment.captured` and `order.paid`.
- Copy the webhook secret into `RAZORPAY_WEBHOOK_SECRET`. Payloads are verified via HMAC-SHA256 (`timingSafeEqual`) and deduplicated in `payment_webhook_events`.

### Reminders, Waitlist Expiry & Membership Expiry Sync Cron
- Schedule a job every **5–10 minutes** (Vercel Cron, GitHub Actions, or external scheduler) calling:
  ```bash
  curl -X POST https://<your-domain>/api/cron/reminders \
    -H "Authorization: Bearer $CRON_SECRET"
  ```
- This expires timed-out waitlist offers (cascading to the next waiting player), sends 2-hour upcoming game reminders, and transitions `ACTIVE` -> `EXPIRING_SOON` -> `EXPIRED` memberships.

---

## 6. Backup & Recovery Guidance
- Enable automated daily PITR/snapshots on your managed PostgreSQL provider.
- Supplement with periodic logical backups:
  ```bash
  pg_dump --format=custom --no-owner "$DATABASE_URL" -f stadium_$(date +%F).dump
  ```
- Test restores periodically against a staging database with `pg_restore` and verify row counts on `profiles`, `memberships`, `payments`, `games`, and `admin_audit_logs`.
- Note on Notifications: Currently notifications are **in-app only**; do not enable or promise external email/WhatsApp delivery until a verified provider SDK + credentials are integrated and tested.
