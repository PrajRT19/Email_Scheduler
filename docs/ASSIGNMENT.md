# ReachInbox Hiring Assignment – Full-stack Email Job Scheduler

## Context
ReachInbox.ai is a product of Outbox Labs focused on transforming cold email outreach with AI-driven workflows. Our all-in-one solution empowers businesses to effortlessly find, enrich, and engage high-intent leads through cold email. With just a single prompt, ReachInbox springs into action, prospecting and verifying leads, crafting personalized email sequences, and notifying businesses of positive leads. ReachInbox is more than a tool; it's your growth partner.

We are looking for passionate and innovative individuals to join our team and help us continue to redefine the future of lead generation and business growth.

---

## 🎯 Problem Statement
At ReachInbox, a huge part of our system is reliable scheduling and sending of emails at scale.
Your task is to build a production-grade email scheduler service + dashboard that:
- Accepts email send requests via APIs
- Schedules them to be sent at a specific time
- Uses BullMQ + Redis as a persistent job scheduler (no cron jobs)
- Sends emails using fake SMTP via Ethereal Email
- Survives server restarts without restarting from scratch or losing jobs
- Exposes a frontend dashboard to:
  - Schedule new emails
  - View scheduled emails
  - View sent emails

Think of it as a tiny slice of what ReachInbox does under the hood.

---

## 🧪 Tech Requirements
You must use:

### Backend
- **Language**: TypeScript
- **Framework**: Express.js
- **Queue**: BullMQ (backed by Redis)
- **Database**: PostgreSQL via Prisma (or MySQL)
- **SMTP**: Ethereal Email (fake SMTP for testing)
- **Search**: Elasticsearch (indexing to make sent/scheduled emails searchable)
- **Monitoring**: Live BullMQ dashboard (Bull Board) for real-time queue visibility

### Frontend
- React.js (Vite)
- Tailwind CSS
- TypeScript strongly preferred / strict
- Rich text: TipTap
- Data parsing: Papa Parse
- Query & State: TanStack Query

### Infra
- Redis (with `appendonly yes`) and PostgreSQL run via Docker Compose, plus Elasticsearch.

---

## 🖥 Backend Requirements

### 1️⃣ Core Scheduler Behavior
Your backend must:
- Accept email scheduling requests via API
- Store them in a relational DB (PostgreSQL)
- Schedule them using BullMQ delayed jobs (no cron)
- Send emails from multiple senders via Ethereal Email (SMTP)
- Must have sent/scheduled emails searchable via Elasticsearch (implement indexing to make emails searchable)
- Must expose a live BullMQ dashboard for real-time queue visibility
- Persist state so that:
  - If the server restarts, future emails are still sent at the correct time
  - Emails are not duplicated or restarted from scratch

### 2️⃣ Throughput, Rate Limiting & Concurrency (Required)
Your scheduler should behave like a real-world email system under load.
You must support:
- ✅ **Worker Concurrency**: Configure BullMQ worker(s) with a configurable concurrency level. Implementation must be safe when multiple jobs run in parallel.
- ✅ **Delay Between Each Email**: Minimum delay between individual email sends (mimicking provider throttling). BullMQ limiter or worker logic. Document in README (e.g. min 2 seconds between sends).
- ✅ **Emails Per Hour (Rate Limiting)**: Rate limit on emails sent per hour per sender (e.g. `MAX_EMAILS_PER_HOUR_PER_SENDER`).
  - Configurable via env/config (no hardcoding).
  - Safe across multiple workers/instances: Redis-backed atomic counters (keyed by `hour_window:sender`).
  - When limit is reached: Do NOT drop or permanently fail jobs. Reschedule into the next available hour window preserving order.
- ✅ **Slack Notification on Rate Limit Hit (Required)**:
  - Real Slack OAuth authorize flow (`Connect Slack` in dashboard) -> backend stores webhook/token per user.
  - Send message to Slack the moment a sender's hourly limit is reached (live, verifiable call).
  - Handle disconnect/reconnect: if not connected, do not notify (no crash); if connected later, works without redeploy.
- ✅ **Behavior Under Load**:
  - Handles 1000+ emails scheduled for roughly the same time.
  - Handles rate limits safely.

### 3️⃣ Hard Constraints (Important)
- ❌ **Do NOT use cron jobs**: No OS-level cron, no node-cron, agenda, etc.
- ✅ **Scheduling must be done using BullMQ delayed jobs** (or custom Redis/DB-based scheduler, no cron).
- ✅ **Persistence**: After restart, future emails still send at right time; emails not re-sent.
- ❌ **Idempotency**: Same email jobs must never be sent more than once.

---

## 🎨 Frontend Requirements
Build a frontend that matches the provided Figma design as closely as possible and talks to the backend APIs.

### 1️⃣ Google Login (Required)
- Real Google OAuth login.
- Redirect to dashboard.
- Top header: user name, email, avatar.
- Simple Logout option.

### 2️⃣ Main Dashboard
- Top header (user info + logout + Slack status).
- Navigation/tabs: Scheduled Emails, Sent Emails.
- Primary "Compose New Email" button.
- Layout and styling closely following Figma.

### 3️⃣ Compose New Email
- Fields: From sender, Subject, Body.
- Upload CSV/text file of email leads: parse and show detected email count clearly.
- Set: Start time (when scheduling begins), Delay between emails, Hourly limit.
- Click Schedule to submit to schedule API.

### 4️⃣ Scheduled Emails
- Table/list: Recipient email, Subject, Scheduled time, Status.
- Loading states, empty states, error retry, pagination.

### 5️⃣ Sent Emails
- Table/list: Recipient email, Subject, Sent time, Status (`sent` / `failed`), preview link.
- Loading states, empty states, error retry, pagination.

### 6️⃣ Frontend Code Quality
- Clean folder structure
- Reusable UI components (buttons, inputs, tables, modals, badges, etc.)
- DRY code
- Proper TypeScript usage with strict interfaces
- Good UX: loading indicators, empty states, toast error handling.
