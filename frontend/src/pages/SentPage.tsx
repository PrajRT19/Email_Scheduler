import { useNavigate, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Send, Star, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { getSentEmails } from '../api/endpoints';
import { StatusBadge, EmailListSkeleton, EmptyState, Button } from '../components/ui';
import { EmailListItem } from '../types/api';

export default function SentPage() {
  const { query } = useOutletContext<{ query: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['emails', 'sent', page, query],
    queryFn: () => getSentEmails({ page, limit: 20, q: query || undefined }),
    placeholderData: (prev) => prev,
  });

  if (isLoading) return <EmailListSkeleton />;

  if (isError) {
    return (
      <EmptyState
        icon={<Send size={48} />}
        title="Could not load sent emails"
        description={(error as any)?.message || 'An error occurred'}
        action={
          <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
            Retry
          </Button>
        }
      />
    );
  }

  const emails: EmailListItem[] = data?.data || [];
  const pagination = data?.pagination;

  if (emails.length === 0) {
    return (
      <EmptyState
        icon={<Send size={48} />}
        title={query ? 'No results found' : 'No sent emails'}
        description={query ? `No emails match "${query}"` : 'Sent and failed emails will appear here.'}
        action={
          !query ? (
            <Button onClick={() => navigate('/compose')}>Compose Email</Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Email List */}
      <div className="flex-1 divide-y divide-surface-border">
        {emails.map((email) => (
          <SentEmailRow key={email.id} email={email} onClick={() => navigate(`/emails/${email.id}`)} />
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-surface-border bg-white">
          <p className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
          </p>
          <div className="flex gap-2">
            <Button
              id="btn-prev-sent"
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              id="btn-next-sent"
              variant="secondary"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SentEmailRow({ email, onClick }: { email: EmailListItem; onClick: () => void }) {
  const sentDate = email.sentAt ? new Date(email.sentAt) : new Date(email.scheduledAt);
  const timeLabel = email.sentAt
    ? `Sent ${format(sentDate, 'MMM d, h:mm a')}`
    : `Scheduled ${format(sentDate, 'MMM d, h:mm a')}`;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-4 px-6 py-4 hover:bg-surface-subtle transition-colors text-left group"
    >
      {/* Avatar placeholder */}
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 mt-0.5 ${
          email.status === 'failed'
            ? 'bg-red-50 text-red-600'
            : 'bg-brand-soft text-brand'
        }`}
      >
        {email.to.charAt(0).toUpperCase()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-gray-900 truncate">{email.to}</span>
          <StatusBadge status={email.status} />
          {email.status === 'failed' && email.failureReason && (
            <span
              className="text-xs text-red-500 truncate flex items-center gap-1 max-w-xs"
              title={email.failureReason}
            >
              <AlertCircle size={12} className="shrink-0" />
              {email.failureReason}
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-gray-800 truncate">{email.subject}</p>
        <p className="text-xs text-gray-500 truncate mt-0.5">{email.bodyPreview}</p>
      </div>

      {/* Right meta */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-xs text-gray-400 whitespace-nowrap">{timeLabel}</span>
        <button
          onClick={(e) => e.stopPropagation()}
          className="text-gray-300 hover:text-yellow-400 transition-colors opacity-0 group-hover:opacity-100"
          title="Star"
        >
          <Star size={14} />
        </button>
      </div>
    </button>
  );
}
