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
Set these in **Vercel -> Project Settings -> Environment Variables** for **Production** (and **Preview** if preview deployments connect to a staging DB). See `.env.example`:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | **Yes** | Hosted PostgreSQL runtime connection string (`?sslmode=require`; if using PgBouncer/transaction pooler such as Supabase port `6543` or Neon `-pooler`, keep `DATABASE_URL` pooled and set `DIRECT_URL` below) |
| `DIRECT_URL` | Recommended | Direct non-pooled PostgreSQL URL (`?sslmode=require`, port `5432`) used by `prisma.config.ts` during `prisma migrate deploy`; falls back to `DATABASE_URL` when unset |
| `APP_URL` | **Yes** | Canonical HTTPS URL with no trailing slash (e.g. `https://your-project.vercel.app` or custom domain) |
| `CRON_SECRET` | **Yes** | High-entropy random secret (`openssl rand -hex 32`) authorizing `POST /api/cron/reminders` |
| `SANDBOX_PAYMENT_SECRET` | **Yes** | High-entropy random secret (`openssl rand -hex 32`) used to sign fallback checkout verification; never leave blank |
| `RAZORPAY_KEY_ID` | For live/test Razorpay | Razorpay Key ID (omit to keep server-signed sandbox checkout only) |
| `RAZORPAY_KEY_SECRET` | For live/test Razorpay | Razorpay Key Secret |
| `RAZORPAY_WEBHOOK_SECRET` | For live/test Razorpay | Razorpay Webhook Secret configured in Razorpay Dashboard |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | For live/test Razorpay | Public Razorpay Key ID (must match `RAZORPAY_KEY_ID`) |
| `SEED_ADMIN_EMAIL` | Bootstrap only | Initial `SUPER_ADMINISTRATOR` email when running `pnpm db:seed` |
| `SEED_ADMIN_PASSWORD` | Bootstrap only | Strong unique password for initial `pnpm db:seed` (do not use demo passwords) |
| `SEED_DEMO_DATA` | Recommended `"false"` | **Must be `"false"`** (or unset) in production so demo accounts are never created |

---

## 3. Database Migration & Initial Bootstrap
Production migrations are automated via `vercel.json` -> `pnpm run vercel-build`:

```bash
prisma generate && prisma migrate deploy && next build --webpack
```

Note on build-time vs runtime database behavior:
- `src/lib/db.ts` initializes `PrismaClient` lazily on first query/transaction rather than at module import time, and public/dynamic App Router pages and API routes declare `export const dynamic = "force-dynamic"`, so `next build` itself never executes PostgreSQL queries during static page generation.
- `prisma migrate deploy` inside `vercel-build` runs once per Vercel deployment against `DIRECT_URL` (or `DATABASE_URL` if `DIRECT_URL` is unset), applying pending SQL files from `prisma/migrations/`.

For initial manual migration verification and one-time stadium catalog bootstrap against your hosted PostgreSQL database:

```bash
pnpm exec prisma generate
pnpm db:migrate:deploy
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
2. Add the environment variables from Section 2 in **Vercel -> Project Settings -> Environment Variables** **before** triggering the build (Make sure they are enabled for **Production** and **Preview** as needed so `prisma migrate deploy` can reach PostgreSQL during `vercel-build`).
3. `vercel.json` configures `pnpm install --frozen-lockfile` and `pnpm run vercel-build` (`prisma generate && prisma migrate deploy && next build --webpack`), and `postinstall` also runs `prisma generate`.
4. Add your custom domain in **Vercel -> Project Settings -> Domains** and verify DNS (`A` / `CNAME`) records. Vercel provisions and renews TLS/HTTPS certificates automatically.
5. Security headers in `next.config.ts` (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Strict-Transport-Security` over HTTPS) and `SameSite=Lax; HttpOnly; Secure` session cookies take effect automatically in production (`NODE_ENV === "production"`).

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
