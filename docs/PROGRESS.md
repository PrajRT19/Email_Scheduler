# Progress & Implementation Tracker

## 1. Requirement Checklist

### Backend Requirements
- [x] **B-REQ-1**: Monorepo directory structure `/backend` with clean modular architecture (`src/{config,routes,controllers,services,queue,workers,db,search,middleware,utils,types}`).
- [x] **B-REQ-2**: Root `docker-compose.yml` orchestrating PostgreSQL, Redis (with `appendonly yes`), and Elasticsearch.
- [x] **B-REQ-3**: Prisma ORM schema with models: `User`, `Sender`, `Batch`, `Email`, `SlackConnection`, along with proper relations and unique constraints.
- [x] **B-REQ-4**: Zod-based environment variable validation and `.env.example`.
- [x] **B-REQ-5**: Centralized error middleware strictly adhering to the API contract error schema `{ "error": { "code", "message", "details" } }`.
- [x] **B-REQ-6**: Health check endpoint `GET /api/health` returning `{ "status": "ok" }`.
- [x] **B-REQ-7**: Google OAuth 2.0 integration (`GET /api/auth/google`, `GET /api/auth/google/callback`) upserting users.
- [x] **B-REQ-8**: Server-side session management via `httpOnly` cookie `sid` and CORS credentials support.
- [x] **B-REQ-9**: Auth endpoints `GET /api/auth/me` and `POST /api/auth/logout`.
- [x] **B-REQ-10**: Route authentication middleware scoping all data access to the authenticated user.
- [x] **B-REQ-11**: Ethereal SMTP test account seeding script (`npm run seed:senders`) and `GET /api/senders` endpoint (credentials never exposed to client).
- [x] **B-REQ-12**: Scheduling endpoint `POST /api/emails/schedule` with full Zod validation (recipients, delay, hourly limit, past date check, deduplication).
- [x] **B-REQ-13**: Transactional creation of Batch and individual Email records.
- [x] **B-REQ-14**: BullMQ delayed job enqueueing using `jobId = email.id` for idempotency and `scheduledAt` calculation.
- [x] **B-REQ-15**: High-volume recipient support (1000+ recipients) with bulk DB inserts and `queue.addBulk` in chunks.
- [x] **B-REQ-16**: Email listing endpoints `GET /api/emails/scheduled` (ordered by `scheduledAt ASC`) and `GET /api/emails/sent` (ordered by `sentAt DESC`) with pagination.
- [x] **B-REQ-17**: Count aggregation endpoint `GET /api/emails/counts` returning scheduled and sent counts.
- [x] **B-REQ-18**: Detail endpoint `GET /api/emails/:id` returning complete email details for the owning user.
- [ ] **B-REQ-19**: Dedicated worker entrypoint (`src/worker.ts`) with configurable `WORKER_CONCURRENCY`.
- [ ] **B-REQ-20**: Atomic database claim before sending (`UPDATE ... SET status='processing' WHERE id=? AND status='scheduled' RETURNING`).
- [ ] **B-REQ-21**: Nodemailer delivery using sender's Ethereal credentials, setting `sentAt` and `previewUrl` on success or `failureReason` on failure.
- [ ] **B-REQ-22**: Per-sender minimum delay guard in Redis using `moveToDelayed` + `DelayedError` (no thread blocking).
- [ ] **B-REQ-23**: Distributed hourly rate limiting per sender via atomic Redis Lua script counter.
- [ ] **B-REQ-24**: Rate limit overflow rescheduling: move job to next hour window preserving sequence, update DB `scheduledAt`, consume no slot.
- [ ] **B-REQ-25**: Slack OAuth v2 integration (`/api/slack/connect`, `/api/slack/callback`, `/api/slack/status`, `/api/slack/disconnect`).
- [ ] **B-REQ-26**: Slack limit-hit notification: webhook alert on first limit hit in window, deduplicated once per sender per window in Redis.
- [ ] **B-REQ-27**: Reconcile on boot: check pending DB emails against BullMQ jobs, re-enqueue missing jobs, recover stuck processing rows.
- [ ] **B-REQ-28**: Elasticsearch indexing for emails and multi-match query on `q` parameter, with graceful PostgreSQL `ILIKE` fallback.
- [ ] **B-REQ-29**: Bull Board dashboard mounted at `/admin/queues`.
- [ ] **B-REQ-30**: Load testing script `scripts/load-test.ts` validating 1000+ emails and rate limit rescheduling.
- [ ] **B-REQ-31**: Vitest test suite covering validation, idempotency, rate limiting, rescheduling, and boot reconciliation.

### Frontend Requirements
- [ ] **F-REQ-1**: Vite + React + TypeScript strict setup with Tailwind CSS matching design tokens from `docs/DESIGN_NOTES.md`.
- [ ] **F-REQ-2**: Reusable UI component library (Button, Input, Badge, Popover/Modal, ListRow, Skeleton, EmptyState, Avatar).
- [ ] **F-REQ-3**: Contract-exact API client with `credentials: "include"`, standard error handling, and TypeScript interfaces matching `docs/API_CONTRACT.md`.
- [ ] **F-REQ-4**: Mock Service Worker (MSW) layer for full local operation via `VITE_USE_MOCKS=true`.
- [ ] **F-REQ-5**: Login page matching design with "Login with Google", styled email/password inputs (disabled/toast), and clean responsive card.
- [ ] **F-REQ-6**: Authentication state management (`useAuth`), route guard, auto-redirect on 401, and logout handling.
- [ ] **F-REQ-7**: Dashboard shell: sidebar with logo, user card, dropdown (logout, Slack connect/disconnect), "Compose" button, "CORE" navigation with dynamic count badges.
- [ ] **F-REQ-8**: Top header bar with debounced search input (`q`), filter icon, and TanStack Query refresh icon.
- [ ] **F-REQ-9**: Scheduled email list view with status/time pill badges, recipient, subject, preview, star icon, loading skeletons, empty state, error state, and pagination.
- [ ] **F-REQ-10**: Sent email list view with sent/failed status pill badges, loading skeletons, empty state, error state, and pagination.
- [ ] **F-REQ-11**: Email detail view with back button, sender details, DOMPurify sanitized HTML body, Ethereal preview link, and visual attachment cards.
- [ ] **F-REQ-12**: Compose page: sender dropdown, recipient chips with `+N` overflow, CSV/TXT upload with Papa Parse validation and deduplication.
- [ ] **F-REQ-13**: Compose parameters: delay between emails input and hourly limit input.
- [ ] **F-REQ-14**: TipTap rich text editor with custom toolbar matching the design (headings, bold, italic, underline, strike, lists, align, quotes, links).
- [ ] **F-REQ-15**: "Send Later" popover with date-time picker and quick presets (Tomorrow, Tomorrow 9AM, 11AM, 3PM) setting `startTime`.
- [ ] **F-REQ-16**: Compose form validation, submit to `POST /api/emails/schedule`, toast notifications, and redirect to Scheduled list.
- [ ] **F-REQ-17**: Slack connect/disconnect modal/actions in user menu with real-time status display.
- [ ] **F-REQ-18**: Vitest + React Testing Library tests for CSV parsing, compose validation, and list state transitions.

---

## 2. Phase Status

| Phase | Description | Status |
|---|---|---|
| **Step 0** | Inspection, design notes, progress tracker, API contract | Completed |
| **B1** | Backend Scaffold (tsconfig, eslint, zod env, docker-compose, Prisma, error middleware, health) | Completed |
| **B2** | Auth (Google OAuth, sessions, /auth/me, logout, requireAuth, CORS) | Completed |
| **B3** | Senders (seed script, GET /senders) | Completed |
| **B4** | Schedule API (validation, transaction, BullMQ enqueue, list, detail, counts, http examples) | Completed |
| **B5** | Worker (sending, idempotent claim, concurrency, per-sender min delay) | Todo |
| **B6** | Rate Limiting (Lua counter, reschedule to next window, load test) | Todo |
| **B7** | Elasticsearch (mapping, indexing on create/update, q search, DB fallback) | Todo |
| **B8** | Slack (OAuth connect/status/disconnect, limit-hit webhook notification) | Todo |
| **B9** | Restart Safety (reconcile on boot, crash recovery manual test) | Todo |
| **B10**| Bull Board (/admin/queues), backend README, checklist pass | Todo |
| **F1** | Frontend Scaffold (Vite, Tailwind, tokens, API client, types, MSW skeleton) | Todo |
| **F2** | UI Primitives + temporary /ui-kit comparison | Todo |
| **F3** | Login page & auth flow (useAuth, route guard, logout) | Todo |
| **F4** | Dashboard layout (sidebar, header, search, counts) | Todo |
| **F5** | Scheduled & Sent lists (states, pagination, search) | Todo |
| **F6** | Email detail page | Todo |
| **F7** | Compose page (fields, CSV upload, chips, editor, Send Later popover, submit) | Todo |
| **F8** | Slack connect/disconnect UI in user menu | Todo |
| **F9** | Polish, visual comparison vs design PNGs, accessibility, frontend README | Todo |
| **I1** | End-to-end integration with live backend (mocks disabled), docs/INTEGRATION.md | Todo |
| **I2** | Root README, full assignment verification, final audit | Todo |

---

## 3. Decisions Log
- **Monorepo Structure**: Separate `/backend` and `/frontend` directories at repository root with independent package configurations and a unified root `docker-compose.yml`.
- **Database Schema**: Prisma ORM with PostgreSQL, using UUID primary keys throughout.
- **Session Store**: Express session using `ioredis` store, matching Redis already required for BullMQ.
- **Idempotent Queue**: BullMQ delayed jobs with `jobId = email.id` ensuring zero duplicate job creation.
- **Search Resiliency**: Elasticsearch client wrapped with try/catch to transparently fallback to PostgreSQL `ILIKE` queries when Elasticsearch is unavailable or starting up.
- **Visual Attachment Handling**: Attachments displayed in the design are visual representations since attachment uploading is out of contract scope.

---

## 4. Environment Variables Inventory

### Backend (`/backend/.env`)
| Variable | Description | Default / Example |
|---|---|---|
| `NODE_ENV` | Environment mode (`development` / `production` / `test`) | `development` |
| `PORT` | HTTP server listening port | `4000` |
| `FRONTEND_URL` | Frontend origin for CORS and OAuth redirects | `http://localhost:5173` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/email_scheduler?schema=public` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `ELASTICSEARCH_NODE` | Elasticsearch endpoint URL | `http://localhost:9200` |
| `SESSION_SECRET` | Secret key for signing session cookie | `reachinbox-session-secret-at-least-32-chars-long` |
| `COOKIE_SECURE` | Set secure flag on cookies (`true` in production) | `false` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `mock-google-client-id` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `mock-google-client-secret` |
| `GOOGLE_CALLBACK_URL` | Google OAuth callback redirect URL | `http://localhost:4000/api/auth/google/callback` |
| `SLACK_CLIENT_ID` | Slack OAuth App Client ID | `mock-slack-client-id` |
| `SLACK_CLIENT_SECRET` | Slack OAuth App Client Secret | `mock-slack-client-secret` |
| `SLACK_REDIRECT_URI` | Slack OAuth callback redirect URL | `http://localhost:4000/api/slack/callback` |
| `WORKER_CONCURRENCY` | Number of concurrent jobs per worker instance | `5` |
| `MIN_DELAY_BETWEEN_EMAILS_SECONDS`| Global minimum floor delay between emails per sender | `2` |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | Default hourly limit per sender if not specified | `50` |
| `MAX_RECIPIENTS_PER_REQUEST` | Hard ceiling on recipients per scheduling request | `5000` |

### Frontend (`/frontend/.env`)
| Variable | Description | Default / Example |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL for backend API | `http://localhost:4000/api` |
| `VITE_USE_MOCKS` | Toggle MSW mock layer (`true` or `false`) | `false` |

---

## 5. Assumptions Log
1. **Google OAuth & Slack in Local Development**: Real Google OAuth and Slack OAuth credentials can be provided in `.env`. For testing without credentials, mock/stub paths will allow local functional development.
2. **Email / Password Form**: Rendered in the Login UI to match the visual design, but permanently disabled with a notification explaining Google OAuth is the active authentication provider.
3. **Queue Scheduling**: BullMQ delayed jobs are the sole scheduling mechanism. Absolutely no cron packages (`node-cron`, `agenda`, `crontab`) are used.
4. **Attachments**: Visual-only UI elements in the Email detail view and Compose view.
5. **Docker Environment**: Docker CLI was not directly in the Windows shell PATH; `docker-compose.yml` is provided at root, and instructions for running both with Docker and with local Node/Postgres/Redis services will be documented.

---

## 6. Known Design Differences
- None currently identified; design measurements and color values extracted from `docs/design/` are documented in `docs/DESIGN_NOTES.md`.

---

## 7. Known Issues
- None currently.

---

## 8. NEXT STEP
- Proceed to **Phase B5: Worker (sending, idempotent claim, concurrency, per-sender min delay)**.
