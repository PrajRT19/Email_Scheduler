import { http, HttpResponse } from 'msw';
import { EmailDetail, EmailListItem, Sender, User } from '../types/api.js';

const mockUser: User = {
  id: 'user-001',
  name: 'Oliver Brown',
  email: 'oliver.brown@domain.io',
  avatarUrl: null,
};

const mockSenders: Sender[] = [
  {
    id: 'sender-001',
    email: 'oliver.brown@domain.io',
    name: 'Oliver Brown',
  },
  {
    id: 'sender-002',
    email: 'support@domain.io',
    name: 'Support Team',
  },
];

let mockScheduledEmails: EmailListItem[] = [
  {
    id: 'email-sched-001',
    batchId: 'batch-001',
    senderId: 'sender-001',
    senderEmail: 'oliver.brown@domain.io',
    to: 'jane.smith@example.com',
    subject: 'Meeting follow up - Scheduled',
    bodyPreview: 'Hi Jane, I just wanted to follow up on our meeting yesterday and share the updated pitch deck...',
    status: 'scheduled',
    scheduledAt: new Date(Date.now() + 3600000).toISOString(),
    sentAt: null,
    failureReason: null,
  },
  {
    id: 'email-sched-002',
    batchId: 'batch-001',
    senderId: 'sender-001',
    senderEmail: 'oliver.brown@domain.io',
    to: 'mike.ross@example.com',
    subject: 'Sweet, great to meet you - Scheduled',
    bodyPreview: 'Hi Mike, just wanted to follow up on our meeting. Let me know if you are open for a quick sync tomorrow.',
    status: 'scheduled',
    scheduledAt: new Date(Date.now() + 7200000).toISOString(),
    sentAt: null,
    failureReason: null,
  },
];

let mockSentEmails: EmailListItem[] = [
  {
    id: 'email-sent-001',
    batchId: 'batch-000',
    senderId: 'sender-001',
    senderEmail: 'oliver.brown@domain.io',
    to: 'sarah.wilson@example.com',
    subject: 'Re: Project Update',
    bodyPreview: 'Thanks for the update, Sarah! Looks good! Let us push the release by Thursday morning.',
    status: 'sent',
    scheduledAt: new Date(Date.now() - 86400000).toISOString(),
    sentAt: new Date(Date.now() - 86390000).toISOString(),
    failureReason: null,
  },
  {
    id: 'email-sent-002',
    batchId: 'batch-000',
    senderId: 'sender-001',
    senderEmail: 'oliver.brown@domain.io',
    to: 'david.miller@example.com',
    subject: 'Issue with login',
    bodyPreview: 'I am facing trouble logging in to the dashboard with my credentials. Could you check the permissions?',
    status: 'failed',
    scheduledAt: new Date(Date.now() - 43200000).toISOString(),
    sentAt: null,
    failureReason: '550 5.1.1 User unknown / mailbox unavailable',
  },
];

let slackStatus = {
  connected: false,
  workspace: null as string | null,
  channel: null as string | null,
};

export const handlers = [
  // Health
  http.get('*/api/health', () => {
    return HttpResponse.json({ status: 'ok' });
  }),

  // Auth Me
  http.get('*/api/auth/me', () => {
    return HttpResponse.json({ user: mockUser });
  }),

  // Logout
  http.post('*/api/auth/logout', () => {
    return HttpResponse.json({ success: true });
  }),

  // Senders
  http.get('*/api/senders', () => {
    return HttpResponse.json({ data: mockSenders });
  }),

  // Counts
  http.get('*/api/emails/counts', () => {
    return HttpResponse.json({
      scheduled: mockScheduledEmails.length,
      sent: 108, // match design pill count
    });
  }),

  // Scheduled Emails
  http.get('*/api/emails/scheduled', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const q = url.searchParams.get('q')?.toLowerCase() || '';

    let filtered = mockScheduledEmails;
    if (q) {
      filtered = filtered.filter(
        (e) =>
          e.to.toLowerCase().includes(q) ||
          e.subject.toLowerCase().includes(q) ||
          e.bodyPreview.toLowerCase().includes(q)
      );
    }

    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return HttpResponse.json({
      data: paginated,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit) || 1,
      },
    });
  }),

  // Sent Emails
  http.get('*/api/emails/sent', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const q = url.searchParams.get('q')?.toLowerCase() || '';

    let filtered = mockSentEmails;
    if (q) {
      filtered = filtered.filter(
        (e) =>
          e.to.toLowerCase().includes(q) ||
          e.subject.toLowerCase().includes(q) ||
          e.bodyPreview.toLowerCase().includes(q)
      );
    }

    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return HttpResponse.json({
      data: paginated,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit) || 1,
      },
    });
  }),

  // Email Detail
  http.get('*/api/emails/:id', ({ params }) => {
    const { id } = params;
    const all = [...mockScheduledEmails, ...mockSentEmails];
    const email = all.find((e) => e.id === id) || mockSentEmails[0];

    const detail: EmailDetail = {
      ...email,
      bodyHtml: `
        <p>Hey Oliver,</p>
        <p>You've just RECEIVED something</p>
        <div style="background-color: #FEF9C3; border-left: 4px solid #F59E0B; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <p style="font-weight: 600; color: #78350F; margin: 0;">* Extremely Exclusive—Only 4 Spots Worldwide Per Year | $20,000 Investment *</p>
          <p style="color: #92400E; margin: 4px 0 0 0;">To explore securing your private transformation, simply reply 'YES' to this email then -</p>
        </div>
        <p>Your coach for world-class performance,</p>
        <p><strong>David</strong></p>
        <p><em>P.S. Always remember that you can develop world-class technique! 🚀</em></p>
      `,
      previewUrl: 'https://ethereal.email/message/sample-preview-id',
      createdAt: email.scheduledAt,
    };

    return HttpResponse.json(detail);
  }),

  // Schedule Emails
  http.post('*/api/emails/schedule', async ({ request }) => {
    const body = (await request.json()) as any;
    const recipients: string[] = body.recipients || [];
    const unique = Array.from(new Set(recipients));
    const duplicatesRemoved = recipients.length - unique.length;

    const newItems: EmailListItem[] = unique.map((to, i) => ({
      id: `email-${Date.now()}-${i}`,
      batchId: `batch-${Date.now()}`,
      senderId: body.senderId || 'sender-001',
      senderEmail: 'oliver.brown@domain.io',
      to,
      subject: body.subject,
      bodyPreview: body.bodyHtml?.replace(/<[^>]*>/g, '').slice(0, 140) || '',
      status: 'scheduled',
      scheduledAt: new Date(Date.now() + i * (body.delayBetweenEmailsSeconds || 2) * 1000).toISOString(),
      sentAt: null,
      failureReason: null,
    }));

    mockScheduledEmails = [...newItems, ...mockScheduledEmails];

    return HttpResponse.json(
      {
        batchId: `batch-${Date.now()}`,
        senderId: body.senderId,
        totalRecipients: recipients.length,
        scheduledCount: unique.length,
        duplicatesRemoved,
        firstScheduledAt: newItems[0]?.scheduledAt || new Date().toISOString(),
        lastScheduledAt: newItems[newItems.length - 1]?.scheduledAt || new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // Slack Status
  http.get('*/api/slack/status', () => {
    return HttpResponse.json(slackStatus);
  }),

  // Slack Disconnect
  http.post('*/api/slack/disconnect', () => {
    slackStatus = { connected: false, workspace: null, channel: null };
    return HttpResponse.json({ connected: false });
  }),
];
