import { apiClient } from './client';
import {
  User,
  Sender,
  EmailListItem,
  EmailDetail,
  Paginated,
  EmailCountsResponse,
  ScheduleEmailInput,
  ScheduleEmailResponse,
} from '../types/api';

// ── Auth ────────────────────────────────────────────────────────────────────
export const getMe = () => apiClient<{ user: User }>('/auth/me');
export const logout = () => apiClient<{ success: boolean }>('/auth/logout', { method: 'POST' });

// ── Senders ──────────────────────────────────────────────────────────────────
export const getSenders = () => apiClient<{ data: Sender[] }>('/senders');

// ── Emails ───────────────────────────────────────────────────────────────────
export const getScheduledEmails = (params: { page?: number; limit?: number; q?: string }) => {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.q) qs.set('q', params.q);
  return apiClient<Paginated<EmailListItem>>(`/emails/scheduled?${qs.toString()}`);
};

export const getSentEmails = (params: { page?: number; limit?: number; q?: string }) => {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.q) qs.set('q', params.q);
  return apiClient<Paginated<EmailListItem>>(`/emails/sent?${qs.toString()}`);
};

export const getEmailCounts = () => apiClient<EmailCountsResponse>('/emails/counts');
export const getEmailDetail = (id: string) => apiClient<EmailDetail>(`/emails/${id}`);
export const scheduleEmails = (input: ScheduleEmailInput) =>
  apiClient<ScheduleEmailResponse>('/emails/schedule', {
    method: 'POST',
    body: JSON.stringify(input),
  });

// ── Slack ─────────────────────────────────────────────────────────────────────
export const getSlackStatus = () =>
  apiClient<{ connected: boolean; teamName?: string | null; connectedAt?: string | null }>('/slack/status');
export const disconnectSlack = () =>
  apiClient<{ disconnected: boolean }>('/slack/disconnect', { method: 'DELETE' });
