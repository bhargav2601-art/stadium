# Security Posture & Controls — Anil Kumble Stadium

## Implemented Security Controls
- **Passwords:** Node `crypto.scrypt` with per-password random 16-byte salt and `timingSafeEqual` verification (`src/server/passwords.ts`).
- **Sessions:** Random 32-byte base64url token; only its SHA-256 hash is stored in `sessions.tokenHash`. Password change invalidates all active sessions for the user.
- **Role & Access Enforcement:** Roles (`MEMBER`, `STAFF`, `ADMINISTRATOR`, `SUPER_ADMINISTRATOR`) and `blocked` flags are loaded from PostgreSQL on each authenticated request (`userForToken`) and checked via `src/domain/permissions.ts`. Client-sent role values are never trusted.
- **Payment Integrity:** Order callbacks and webhooks require HMAC-SHA256 verification with `timingSafeEqual` (`src/domain/payments.ts`). Prices/amounts are derived strictly server-side.
- **HTTP Headers:** `next.config.ts` sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and disables `X-Powered-By`.
- **Redirect & Input Sanitization:** `cleanText` strips `<` / `>` and normalizes whitespace; `safeNextPath` blocks protocol-relative and backslash redirects.

## Hardening & Follow-Up Controls (Phases 1–10)
- **Cookies:** Set session cookies with `httpOnly: true`, `sameSite: "lax"`, `path: "/"`, and `secure: true` in production.
- **Validation:** Validate all API payloads strictly with Zod schemas on the server.
- **Rate Limiting:** Evict expired buckets in `src/server/rate-limit.ts` and combine client IP + email for auth routes; note that in-memory rate limiting is per-process and should use Redis/Upstash in multi-instance production.
- **Cron Protection:** Protect `POST /api/cron/reminders` with constant-time Bearer token verification against `CRON_SECRET`.
- **Upload Safety:** Validate uploaded avatar MIME types and byte size server-side and disallow arbitrary paths.
