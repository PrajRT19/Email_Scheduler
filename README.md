# 🚀 ReachInbox — Distributed Email Job Scheduler & Dashboard

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![BullMQ](https://img.shields.io/badge/Queue-BullMQ-red.svg)](https://docs.bullmq.io/)
[![Redis](https://img.shields.io/badge/Cache-Redis-d82c20.svg)](https://redis.io/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791.svg)](https://www.postgresql.org/)
[![Elasticsearch](https://img.shields.io/badge/Search-Elasticsearch-005571.svg)](https://www.elastic.co/)

A production-grade, fault-tolerant distributed email scheduling system and campaign management dashboard capable of handling high-volume cold outreach with atomic rate limiting, concurrency pacing, crash-safe queue reconciliation, full-text search, and real-time Slack alerting.

---

## 📑 Table of Contents

- [🌟 Key Architectural Features](#-key-architectural-features)
- [🏗 System Architecture](#-system-architecture)
- [📦 Tech Stack](#-tech-stack)
- [⚡ Quickstart & Local Setup](#-quickstart--local-setup)
- [🔐 Environment Variables](#-environment-variables)
- [📡 API Documentation](#-api-documentation)
- [🧪 Testing & Verification](#-testing--verification)
- [📊 Monitoring & Bull Board](#-monitoring--bull-board)
- [🛡 Failure Recovery & Reliability](#-failure-recovery--reliability)
- [📁 Project Structure](#-project-structure)
- [📄 License](#-license)

---

## 🌟 Key Architectural Features

- **Idempotent Job Scheduling (BullMQ + Redis)**:
  Zero reliance on brittle cron jobs. Jobs are scheduled as persistent BullMQ delayed jobs using deterministic `jobId = email.id`, ensuring absolute deduplication and idempotent retries.
- **Distributed Atomic Rate Limiting (Redis Lua)**:
  Atomic Lua scripts enforce rolling hourly email limits per sender across horizontally scaled worker clusters. Over-limit jobs are automatically and deterministically rescheduled to the beginning of the next hour window while strictly preserving queue sequence.
- **Provider Concurrency Pacing**:
  Non-blocking worker throttling using `moveToDelayed` and `DelayedError` guarantees a minimum spacing delay (e.g., 2–5 seconds) between consecutive emails per sender, eliminating SMTP provider rate-penalty strikes.
- **Crash Recovery & Queue Reconciliation**:
  On boot or ungraceful shutdown, a reconciliation routine scans PostgreSQL for interrupted states (`PENDING`/`PROCESSING`) and automatically re-synchronizes Redis queues, preventing dropped jobs.
- **Elasticsearch Full-Text Search with PostgreSQL Fallback**:
  Multi-field fuzzy search across recipients, subjects, and email bodies via Elasticsearch, with automatic degradation to PostgreSQL `ILIKE` if Elasticsearch is unavailable.
- **Real-Time Slack Incident Alerting**:
  Integrates Slack OAuth & Webhooks to send instant, debounced operational alerts when a sender first exhausts their hourly sending quota.
- **Enterprise Queue Telemetry (Bull Board)**:
  Built-in real-time monitoring interface at `/admin/queues` showing active, waiting, delayed, and failed jobs with manual retry triggers.
- **Modern Responsive Dashboard**:
  Built with React 18, Vite, TypeScript (strict), Tailwind CSS, TipTap rich text editor, Papa Parse CSV lead ingestion, and MSW for isolated development.

---

## 🏗 System Architecture

```
                                    +-----------------------+
                                    |    React Frontend     |
                                    | (Tailwind + TipTap)   |
                                    +-----------+-----------+
                                                |
                                          HTTP REST API
                                                |
                                                v
+-----------------------+           +-----------------------+           +-----------------------+
|     PostgreSQL        |<--------->|   Express API Server  |<--------->|     Redis Queue       |
| (Emails, Senders,     |           |   (Zod, Prisma, Auth) |           | (BullMQ delayed jobs) |
|  Slack Auth Tokens)   |           +-----------+-----------+           +-----------+-----------+
+-----------------------+                       |                                   |
            ^                                   | Read/Write                        | Jobs
            |                                   v                                   v
+-----------+-----------+           +-----------------------------------------------------------+
|     Elasticsearch     |<----------|                   BullMQ Worker Pool                      |
| (Email full-text idx) |           | - Atomic Lua rate-limiter check                           |
+-----------------------+           | - Sender inter-email delay guard                          |
                                    | - Transporter send (Nodemailer / Ethereal / SES)          |
                                    | - Slack alerting on limit breach                          |
                                    +-----------------------------------------------------------+
```

---

## 📦 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, TipTap Editor, Papa Parse |
| **Backend API** | Node.js, Express, TypeScript, Zod, Prisma ORM |
| **Queue & Cache** | Redis 7 (AOF enabled), BullMQ, Bull Board |
| **Database** | PostgreSQL 16 |
| **Search Engine**| Elasticsearch 8.11 |
| **Mail Transport** | Nodemailer (Ethereal test accounts / SMTP) |
| **Alerting** | Slack Web API / Incoming Webhooks / OAuth |
| **Testing** | Vitest, React Testing Library, Supertest, Mock Service Worker (MSW) |
| **DevOps** | Docker Compose |

---

## ⚡ Quickstart & Local Setup

### Prerequisites
- [Docker & Docker Compose](https://www.docker.com/)
- [Node.js](https://nodejs.org/) (v18.x or v20.x recommended)
- `npm` or `pnpm`

---

### Step 1: Start Core Infrastructure (Docker)
Run the orchestrated Docker containers for PostgreSQL, Redis, and Elasticsearch:

```bash
docker compose up -d
```
Verify all 3 containers are healthy:
```bash
docker compose ps
```

---

### Step 2: Configure and Run Backend

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Synchronize database schema & generate Prisma client
npx prisma db push

# 4. Seed test email senders (auto-creates Ethereal test accounts)
npm run seed:senders

# 5. Start API Server (Terminal 1)
npm run dev

# 6. Start BullMQ Queue Worker (Terminal 2)
npm run dev:worker
```
The API will be live at `http://localhost:4000` and the Bull Board monitoring dashboard at `http://localhost:4000/admin/queues`.

---

### Step 3: Configure and Run Frontend

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Start development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `PORT` | Express HTTP server port | `4000` |
| `NODE_ENV` | Application environment (`development` / `production`) | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://reachinbox:reachinbox@localhost:5432/reachinbox` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `ELASTICSEARCH_NODE` | Elasticsearch endpoint | `http://localhost:9200` |
| `SLACK_CLIENT_ID` | Slack App Client ID | Optional |
| `SLACK_CLIENT_SECRET` | Slack App Client Secret | Optional |
| `SLACK_REDIRECT_URI` | Slack OAuth callback URL | `http://localhost:4000/api/slack/callback` |
| `FRONTEND_URL` | Frontend origin for CORS and OAuth redirects | `http://localhost:5173` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Base URL of backend REST API | `http://localhost:4000` |
| `VITE_USE_MSW` | Enable Mock Service Worker offline fallback | `false` |

---

## 📡 API Documentation

### Core Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | System health check (PostgreSQL, Redis, Elasticsearch) |
| `GET` | `/senders` | List all configured sending accounts with quota status |
| `POST` | `/schedule` | Schedule an email or batch of emails |
| `GET` | `/emails` | List scheduled/sent emails with status filters |
| `GET` | `/emails/counts` | Aggregated count statistics (Scheduled, Sent, Failed) |
| `GET` | `/emails/:id` | Detailed email inspect including dispatch logs |
| `GET` | `/search` | Elasticsearch multi-match fuzzy search across emails |
| `GET` | `/api/slack/install` | Initiate Slack OAuth integration flow |
| `GET` | `/api/slack/callback` | Handle Slack OAuth redirect & exchange credentials |
| `GET` | `/admin/queues` | Bull Board UI for queue inspection & job management |

---

## 🧪 Testing & Verification

Comprehensive test coverage across both API, workers, and frontend components:

### Backend Tests
```bash
cd backend
npm test               # Run all 27 unit & integration tests
npm run typecheck      # TypeScript compilation check
npm run lint           # ESLint validation
npm run load-test      # High-concurrency 1,000+ job stress test
```

### Frontend Tests
```bash
cd frontend
npm test               # Run React component & parser tests
npm run typecheck      # Strict TypeScript check
npm run lint           # ESLint validation
npm run build          # Validate production build artifacts
```

---

## 📊 Monitoring & Bull Board

Bull Board is included out of the box to give full observability into queue state:
- **URL**: `http://localhost:4000/admin/queues`
- **Capabilities**:
  - Live inspection of `Waiting`, `Active`, `Delayed`, `Completed`, and `Failed` jobs.
  - View individual job payloads and retry backoff metadata.
  - Manually retry or clean failed and delayed jobs.

---

## 🛡 Failure Recovery & Reliability

1. **Boot Reconciliation**:
   If the worker process crashes or the server is forcibly rebooted while emails are marked `PENDING` or `PROCESSING`, the reconciliation worker detects untracked records and re-enqueues them into BullMQ without double-sending.
2. **Atomic Rate Rescheduling**:
   Redis Lua scripts prevent race conditions across parallel worker instances. When a sender's hourly limit is reached, jobs are moved into the next hour slot gracefully.
3. **Graceful Shutdown**:
   Listens for `SIGTERM` and `SIGINT` to allow active email dispatches to complete before closing database and Redis connections.

---

## 📁 Project Structure

```
.
├── backend/
│   ├── prisma/
│   │   └── schema.prisma        # Database schema
│   ├── src/
│   │   ├── config/              # Zod environment schema
│   │   ├── controllers/         # Express endpoint controllers
│   │   ├── db/                  # Prisma client singleton
│   │   ├── queue/               # BullMQ queues & Redis connections
│   │   ├── services/            # Rate limiting, Slack, Search, Mailer services
│   │   ├── workers/             # Email processor & BullMQ worker
│   │   ├── server.ts            # API server entrypoint
│   │   └── worker.ts            # Background worker entrypoint
│   └── tests/                   # Integration and unit tests
├── frontend/
│   ├── src/
│   │   ├── api/                 # Strongly-typed API client
│   │   ├── components/          # Reusable UI component library
│   │   ├── pages/               # Dashboard, Scheduled, Sent, Compose pages
│   │   └── tests/               # React Testing Library test suite
│   ├── tailwind.config.js       # Design system styling tokens
│   └── vite.config.ts           # Vite build configuration
├── docker-compose.yml           # PostgreSQL, Redis & Elasticsearch services
└── README.md                    # Project documentation
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
