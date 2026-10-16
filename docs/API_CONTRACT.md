# API CONTRACT (source of truth)

Conventions: base path /api. JSON, camelCase, ISO-8601 UTC date strings, UUID string ids. Auth is an httpOnly session cookie named "sid"; CORS must allow FRONTEND_URL with credentials; the frontend only sends credentials. Unauthenticated requests return 401 and the frontend redirects to /login. Error body for ALL errors: { "error": { "code": string, "message": string, "details"?: any } } with codes VALIDATION_ERROR(400), UNAUTHENTICATED(401), FORBIDDEN(403), NOT_FOUND(404), CONFLICT(409), INTERNAL(500). Pagination: query ?page=1&limit=20 (limit max 100), response { "data": T[], "pagination": { "page", "limit", "total", "totalPages" } }.

Types:
  User { id, name, email, avatarUrl: string|null }
  Sender { id, email, name }
  EmailStatus = "scheduled" | "processing" | "sent" | "failed"
  EmailListItem { id, batchId, senderId, senderEmail, to, subject, bodyPreview (plain text, max 140 chars), status: EmailStatus, scheduledAt, sentAt: string|null, failureReason: string|null }
  EmailDetail = EmailListItem + { bodyHtml: string, previewUrl: string|null (Ethereal preview link), createdAt }

Endpoints:
  GET  /api/health -> { status: "ok" }
  GET  /api/auth/google -> 302 to Google consent (real OAuth)
  GET  /api/auth/google/callback -> sets cookie, 302 to {FRONTEND_URL}/dashboard
  GET  /api/auth/me -> { user: User } (401 if not logged in)
  POST /api/auth/logout -> { success: true }
  GET  /api/senders -> { data: Sender[] }
  POST /api/emails/schedule
       body { senderId: string, subject: string, bodyHtml: string, recipients: string[], startTime: ISO string, delayBetweenEmailsSeconds: int>=0, hourlyLimit: int>=1 }
       201 -> { batchId, senderId, totalRecipients, scheduledCount, duplicatesRemoved, firstScheduledAt, lastScheduledAt }
       Validation: subject, bodyHtml and recipients non-empty; every recipient a valid email (400 with details listing the bad ones); recipients max = env MAX_RECIPIENTS_PER_REQUEST; startTime more than 60s in the past -> 400, otherwise clamp to now; duplicates inside one request are removed and counted.
  GET  /api/emails/scheduled?page&limit&q -> Paginated<EmailListItem> (status scheduled|processing, ordered by scheduledAt ASC)
  GET  /api/emails/sent?page&limit&q -> Paginated<EmailListItem> (status sent|failed, ordered by sentAt DESC)
  GET  /api/emails/counts -> { scheduled: number, sent: number }
  GET  /api/emails/:id -> EmailDetail (only the owner's)
  GET  /api/slack/status -> { connected: boolean, workspace: string|null, channel: string|null }
  GET  /api/slack/connect -> 302 to Slack OAuth authorize (browser navigation, session required)
  GET  /api/slack/callback -> stores the incoming-webhook token per user, 302 to {FRONTEND_URL}/dashboard?slack=connected (or =error)
  POST /api/slack/disconnect -> { connected: false }
  Non-API: /admin/queues (Bull Board).
All /api routes except health and auth/google* require a session. Every email query is scoped to the logged-in user. The "q" param uses Elasticsearch (to, subject, body) and falls back to DB ILIKE only if ES is down.
