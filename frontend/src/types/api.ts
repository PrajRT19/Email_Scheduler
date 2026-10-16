export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface Sender {
  id: string;
  email: string;
  name: string;
}

export type EmailStatus = 'scheduled' | 'processing' | 'sent' | 'failed';

export interface EmailListItem {
  id: string;
  batchId: string;
  senderId: string;
  senderEmail: string;
  to: string;
  subject: string;
  bodyPreview: string; // plain text, max 140 chars
  status: EmailStatus;
  scheduledAt: string; // ISO-8601 UTC
  sentAt: string | null;
  failureReason: string | null;
}

export interface EmailDetail extends EmailListItem {
  bodyHtml: string;
  previewUrl: string | null; // Ethereal preview link
  createdAt: string; // ISO-8601 UTC
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

export interface ScheduleEmailInput {
  senderId: string;
  subject: string;
  bodyHtml: string;
  recipients: string[];
  startTime: string; // ISO-8601 UTC
  delayBetweenEmailsSeconds: number; // int >= 0
  hourlyLimit: number; // int >= 1
}

export interface ScheduleEmailResponse {
  batchId: string;
  senderId: string;
  totalRecipients: number;
  scheduledCount: number;
  duplicatesRemoved: number;
  firstScheduledAt: string;
  lastScheduledAt: string;
}

export interface EmailCountsResponse {
  scheduled: number;
  sent: number;
}

export interface SlackStatusResponse {
  connected: boolean;
  workspace: string | null;
  channel: string | null;
}

export interface ApiErrorResponse {
  error: {
    code: 'VALIDATION_ERROR' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL';
    message: string;
    details?: any;
  };
}
