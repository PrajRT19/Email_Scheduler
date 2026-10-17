# ReachInbox Scheduler Service – Backend

Production-grade asynchronous email job scheduler and worker service built with Express, BullMQ, Redis, PostgreSQL (Prisma), Elasticsearch, and Nodemailer.

---

## 🛠 Technology Stack

- **Runtime**: Node.js + TypeScript (strict mode)
- **Framework**: Express.js
- **Queue & Scheduling**: BullMQ backed by Redis (persistent delayed jobs, no cron jobs)
- **Database**: PostgreSQL orchestrated via Prisma ORM
- **Search**: Elasticsearch with automatic PostgreSQL `ILIKE` fallback
- **Delivery**: Nodemailer with Ethereal Email (fake SMTP)
- **Observability**: Bull Board mounted at `/admin/queues`
- **Testing**: Vitest with unit & integration test coverage (27 tests)

---

## 🚀 Key Architectural Features

### 1. Persistent Delayed Jobs (Zero Cron)
All email scheduling is performed using BullMQ delayed jobs (`jobId = email.id`). If the application or worker restarts, Redis and PostgreSQL state ensure pending jobs execute at their scheduled time with zero duplicates and zero dropped jobs.

### 2. Distributed Hourly Rate Limiter (Lua Script)
Each sender is constrained by an hourly rate limit (default 50/hr). Throttling is managed atomically via a Redis Lua script (`checkAndIncrementHourlyLimit`). When the limit is reached:
- Jobs are never dropped or failed permanently.
- The job is rescheduled to the top of the next hour window preserving original ordering.
- A Slack notification is triggered on the first limit-hit per sender window.

### 3. Per-Sender Minimum Delay Guard
To prevent provider throttling (minimum 2 seconds between emails per sender), the worker verifies the last sent timestamp in Redis. If a send occurs too soon, `job.moveToDelayed` is invoked with `DelayedError`, non-blockingly releasing the worker thread.

### 4. Boot-time Reconcile & Crash Recovery
On application startup, `reconcileQueueOnBoot` runs:
- Inspects pending `scheduled` emails in PostgreSQL against BullMQ jobs and re-enqueues any missing jobs.
- Recovers any emails stuck in `processing` status due to unexpected node termination.

### 5. Elasticsearch with Graceful Fallback
Email searches query Elasticsearch via multi-match (`to`, `subject`, `bodyPreview`). If Elasticsearch is offline or indexing is in-flight, queries gracefully fallback to PostgreSQL `ILIKE`.

---

## 📦 Getting Started

### Prerequisites
- Node.js >= 18
- Docker & Docker Compose (or local PostgreSQL, Redis, Elasticsearch)

### Setup & Run

1. **Install dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Environment Variables**:
   Copy `.env.example` to `.env` and configure:
   ```env
   PORT=4000
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/email_scheduler?schema=public"
   REDIS_URL="redis://localhost:6379"
   ELASTICSEARCH_NODE="http://localhost:9200"
   SESSION_SECRET="reachinbox-session-secret-at-least-32-chars-long"
   ```

3. **Database Migration & Seeding**:
   ```bash
   npx prisma db push
   npm run seed:senders
   ```

4. **Start Development Server & Worker**:
   ```bash
   # Terminal 1: API Server
   npm run dev

   # Terminal 2: Queue Worker
   npm run dev:worker
   ```

5. **Run Tests & Linter**:
   ```bash
   npm test
   npm run lint
   npm run typecheck
   ```

6. **Load Testing (1000+ emails)**:
   ```bash
   npm run load-test
   ```

7. **Queue Dashboard**:
   Navigate to `http://localhost:4000/admin/queues` to inspect live queues, active workers, delayed jobs, and throughput metrics in Bull Board.
