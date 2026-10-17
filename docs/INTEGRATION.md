# End-to-End System Integration Guide

This document describes how the ReachInbox Full-stack Email Job Scheduler backend and frontend communicate and operate together in both local development and containerized environments.

---

## 1. Architecture Overview

```
                      ┌────────────────────────┐
                      │    Vite + React UI     │
                      │  (http://localhost:5173)│
                      └───────────┬────────────┘
                                  │ HTTP + Cookies (credentials: include)
                                  ▼
                      ┌────────────────────────┐
                      │   Express API Server   │
                      │  (http://localhost:4000)│
                      └─────┬─────┬─────┬──────┘
                            │     │     │
         ┌──────────────────┘     │     └───────────────────┐
         ▼                        ▼                         ▼
┌──────────────────┐    ┌──────────────────┐     ┌──────────────────────┐
│    PostgreSQL    │    │      Redis       │     │    Elasticsearch     │
│ (Prisma Models)  │    │ (BullMQ, Rate    │     │ (Multi-match search, │
│                  │    │  Limits, SIDs)   │     │  fallback to ILIKE)  │
└──────────────────┘    └─────────┬────────┘     └──────────────────────┘
                                  │
                                  ▼
                        ┌──────────────────┐
                        │  BullMQ Worker   │
                        │  (Dedicated VM/  │
                        │   Process Pool)  │
                        └─────────┬────────┘
                                  │
                                  ▼
                        ┌──────────────────┐
                        │  Ethereal SMTP   │
                        │  (Nodemailer)    │
                        └──────────────────┘
```

---

## 2. Authentication Flow

1. User clicks **Continue with Google** on the Login screen (`/login`).
2. Browser navigates to `GET /api/auth/google`, initiating the OAuth 2.0 flow.
3. Upon callback (`/api/auth/google/callback`), the user is upserted into PostgreSQL, a session is saved in Redis, and an `httpOnly` signed `sid` cookie is issued.
4. User is redirected to `/scheduled` on the frontend.
5. All subsequent API queries transmit `credentials: 'include'` with the session cookie.
6. `GET /api/auth/me` validates the active session on page loads. `POST /api/auth/logout` clears Redis and destroys the cookie.

---

## 3. Campaign Scheduling Flow

1. User opens `/compose` in the frontend dashboard.
2. Verified senders are fetched from `GET /api/senders`.
3. User adds recipient emails either manually or by uploading a `.csv` / `.txt` file parsed by Papa Parse.
4. User inputs subject, body (TipTap editor), pacing delay (seconds), and hourly rate limits.
5. User optionally selects a "Send Later" preset or exact date-time via the popover.
6. On submission (`POST /api/emails/schedule`):
   - Backend validates payload via Zod.
   - Batch and individual Email records are created in PostgreSQL in an atomic transaction.
   - Delayed BullMQ jobs are enqueued in chunks via `queue.addBulk` with `jobId = email.id` (idempotency key).
   - Emails are indexed asynchronously in Elasticsearch.
   - Frontend receives confirmation and navigates to the Scheduled list view.

---

## 4. Worker Execution, Throttling & Rescheduling

1. The dedicated worker (`src/worker.ts`) picks up delayed jobs when `scheduledAt <= now`.
2. **Idempotent Claim**:
   An atomic query claims the email record:
   ```sql
   UPDATE emails SET status = 'processing' WHERE id = $1 AND status = 'scheduled' RETURNING *;
   ```
   If already claimed or sent, the job exits immediately with zero side-effects.
3. **Per-Sender Minimum Delay Guard**:
   Redis stores `last_sent:<senderId>`. If less than `MIN_DELAY_BETWEEN_EMAILS_SECONDS` have elapsed, the job is deferred via `job.moveToDelayed` with `DelayedError` without blocking threads.
4. **Hourly Rate Limit Guard**:
   Atomic Redis Lua script increments the counter for `window:<YYYY-MM-DD-HH>:<senderId>`.
   - If counter exceeds limit, the job is rescheduled into the next hour window and the database `scheduledAt` timestamp is updated.
   - If this is the first limit hit for the window, an alert is dispatched to the user's connected Slack webhook (deduplicated per sender per window).
5. **SMTP Delivery**:
   The email is dispatched via Nodemailer to the sender's Ethereal SMTP account. On success, `sentAt` and Ethereal's `previewUrl` are saved and updated in Elasticsearch.

---

## 5. Live Queue Monitoring

The live BullMQ queue dashboard (Bull Board) is mounted at:
`http://localhost:4000/admin/queues`

This provides real-time visibility into:
- Active jobs and worker threads
- Delayed jobs and scheduled execution times
- Completed jobs and throughput graphs
- Failed jobs and retry stacks
