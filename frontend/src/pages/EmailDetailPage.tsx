import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Paperclip, Clock, CheckCircle, AlertTriangle, FileImage, Download } from 'lucide-react';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import { getEmailDetail } from '../api/endpoints';
import { StatusBadge, Skeleton, EmptyState, Button } from '../components/ui';

export default function EmailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: email, isLoading, isError, error } = useQuery({
    queryKey: ['email', id],
    queryFn: () => getEmailDetail(id!),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !email) {
    return (
      <EmptyState
        icon={<AlertTriangle size={48} />}
        title="Email not found"
        description={(error as any)?.message || 'The requested email could not be retrieved.'}
        action={
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        }
      />
    );
  }

  const cleanHtml = DOMPurify.sanitize(email.bodyHtml || '');
  const displayDate = email.sentAt ? new Date(email.sentAt) : new Date(email.scheduledAt);
  const formattedDate = format(displayDate, 'MMM d, yyyy · h:mm a');

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
      {/* Top action row */}
      <div className="flex items-center justify-between gap-4 border-b border-surface-border pb-4">
        <div className="flex items-center gap-3">
          <button
            id="btn-back-detail"
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl text-gray-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-surface-border transition-all"
            title="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight truncate max-w-xl">
            {email.subject}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={email.status} />
          {email.previewUrl && (
            <a
              id="link-ethereal-preview"
              href={email.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-soft text-brand hover:bg-brand hover:text-white transition-all text-xs font-semibold shadow-sm"
              title="Open fake Ethereal SMTP message preview"
            >
              <ExternalLink size={13} />
              Ethereal Preview
            </a>
          )}
        </div>
      </div>

      {/* Failure banner if status is failed */}
      {email.status === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-red-800">Email delivery failed</h4>
            <p className="text-xs text-red-700 mt-0.5">
              {email.failureReason || 'An unknown error occurred during delivery.'}
            </p>
          </div>
        </div>
      )}

      {/* Email metadata header card */}
      <div className="bg-white border border-surface-border rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-brand text-white font-bold flex items-center justify-center text-base shadow-sm">
              {email.senderEmail ? email.senderEmail.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 text-sm">
                  {email.senderEmail || 'Sender'}
                </span>
                <span className="text-xs text-gray-400">
                  &lt;{email.senderEmail}&gt;
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                to <span className="font-medium text-gray-700">{email.to}</span>
              </p>
            </div>
          </div>

          <div className="text-right text-xs text-gray-500">
            <div className="flex items-center gap-1.5 justify-end">
              {email.sentAt ? <CheckCircle size={13} className="text-brand" /> : <Clock size={13} className="text-amber-500" />}
              <span>{formattedDate}</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              ID: {email.id}
            </p>
          </div>
        </div>
      </div>

      {/* Email Body content */}
      <div className="bg-white border border-surface-border rounded-2xl p-6 md:p-8 shadow-sm">
        <div
          className="prose prose-sm max-w-none text-gray-800 leading-relaxed font-sans"
          dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />

        {/* Visual Attachments section (matching design notes & Figma frame) */}
        <div className="mt-8 pt-6 border-t border-surface-border">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            <Paperclip size={14} />
            Attachments (2)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 bg-surface-muted border border-surface-border rounded-xl hover:bg-gray-100 transition-colors cursor-pointer group">
              <div className="w-10 h-10 rounded-lg bg-brand-soft text-brand flex items-center justify-center shrink-0">
                <FileImage size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">tennis_cover_male.png</p>
                <p className="text-[11px] text-gray-400">1.1 MB</p>
              </div>
              <Download size={15} className="text-gray-400 group-hover:text-brand transition-colors" />
            </div>

            <div className="flex items-center gap-3 p-3 bg-surface-muted border border-surface-border rounded-xl hover:bg-gray-100 transition-colors cursor-pointer group">
              <div className="w-10 h-10 rounded-lg bg-brand-soft text-brand flex items-center justify-center shrink-0">
                <FileImage size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">tennis_1-reduce.png</p>
                <p className="text-[11px] text-gray-400">1.1 MB</p>
              </div>
              <Download size={15} className="text-gray-400 group-hover:text-brand transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
