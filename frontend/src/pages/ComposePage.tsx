import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Upload,
  Clock,
  Send,
  X,
  Calendar,
  ChevronDown,
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Strikethrough as StrikeIcon,
  List as ListIcon,
  ListOrdered as OrderedListIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Quote,
  Code,
  Link2,
  Undo2,
  Redo2,
  Paperclip,
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Papa from 'papaparse';
import { format, addDays, setHours, setMinutes, setSeconds } from 'date-fns';
import toast from 'react-hot-toast';

import { getSenders, scheduleEmails } from '../api/endpoints';
import { Button } from '../components/ui';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export default function ComposePage() {
  const navigate = useNavigate();

  // Senders query
  const { data: sendersData, isLoading: isLoadingSenders } = useQuery({
    queryKey: ['senders'],
    queryFn: getSenders,
  });

  const senders = sendersData?.data || [];

  // Form State
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [toInput, setToInput] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [delaySeconds, setDelaySeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(50);

  // Send Later State
  const [scheduledStartTime, setScheduledStartTime] = useState<Date | null>(null);
  const [popoverOpen, setPopoverOpen] = useState<boolean>(false);
  const [tempDateString, setTempDateString] = useState<string>('');
  const [showAllRecipients, setShowAllRecipients] = useState<boolean>(false);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // File input ref for CSV/TXT upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-select first sender when loaded
  useEffect(() => {
    if (senders.length > 0 && !selectedSenderId) {
      setSelectedSenderId(senders[0].id);
    }
  }, [senders, selectedSenderId]);

  // TipTap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-brand underline' },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: '<p>Hi there,</p><p>I am reaching out regarding...</p>',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none focus:outline-none min-h-[220px] p-4 text-gray-900',
      },
    },
  });

  // Handle manual typing of recipient emails
  const addRecipient = (emailCandidate: string) => {
    const trimmed = emailCandidate.trim().toLowerCase();
    if (!trimmed) return;

    if (!EMAIL_REGEX.test(trimmed)) {
      toast.error(`Invalid email format: ${trimmed}`);
      return;
    }

    if (recipients.includes(trimmed)) {
      toast('Email already added', { icon: 'ℹ️' });
      return;
    }

    setRecipients((prev) => [...prev, trimmed]);
    setToInput('');
  };

  const handleToKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addRecipient(toInput);
    } else if (e.key === 'Backspace' && !toInput && recipients.length > 0) {
      setRecipients((prev) => prev.slice(0, -1));
    }
  };

  const removeRecipient = (indexToRemove: number) => {
    setRecipients((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Handle CSV/TXT File Upload via Papa Parse
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      Papa.parse(file, {
        complete: (results) => {
          const extracted: string[] = [];
          for (const row of results.data as string[][]) {
            if (Array.isArray(row)) {
              for (const cell of row) {
                if (typeof cell === 'string') {
                  const cleaned = cell.trim().toLowerCase();
                  if (EMAIL_REGEX.test(cleaned)) {
                    extracted.push(cleaned);
                  }
                }
              }
            }
          }
          processExtractedEmails(extracted);
        },
        error: (err) => {
          toast.error(`Error reading CSV: ${err.message}`);
        },
      });
    } else {
      // Text file line by line
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) return;
        const lines = text.split(/[\r\n,]+/);
        const extracted: string[] = [];
        for (const line of lines) {
          const cleaned = line.trim().toLowerCase();
          if (EMAIL_REGEX.test(cleaned)) {
            extracted.push(cleaned);
          }
        }
        processExtractedEmails(extracted);
      };
      reader.readAsText(file);
    }

    // Reset input
    e.target.value = '';
  };

  const processExtractedEmails = (extracted: string[]) => {
    const currentSet = new Set(recipients);
    let addedCount = 0;
    for (const email of extracted) {
      if (!currentSet.has(email)) {
        currentSet.add(email);
        addedCount++;
      }
    }
    setRecipients(Array.from(currentSet));
    toast.success(`Imported ${addedCount} valid recipients from list!`);
  };

  // Preset time helpers for Send Later popover
  const setQuickPreset = (type: 'tomorrow' | '9am' | '11am' | '3pm') => {
    const now = new Date();
    let target = addDays(now, 1);

    if (type === 'tomorrow') {
      // same time tomorrow
      target = addDays(now, 1);
    } else if (type === '9am') {
      target = setSeconds(setMinutes(setHours(target, 9), 0), 0);
    } else if (type === '11am') {
      target = setSeconds(setMinutes(setHours(target, 11), 0), 0);
    } else if (type === '3pm') {
      target = setSeconds(setMinutes(setHours(target, 15), 0), 0);
    }

    setScheduledStartTime(target);
    setPopoverOpen(false);
    toast.success(`Scheduled for ${format(target, 'MMM d, h:mm a')}`);
  };

  const handleApplyCustomTime = () => {
    if (!tempDateString) {
      setScheduledStartTime(null);
      setPopoverOpen(false);
      return;
    }
    const parsed = new Date(tempDateString);
    if (isNaN(parsed.getTime())) {
      toast.error('Invalid date and time selected');
      return;
    }
    if (parsed.getTime() < Date.now() - 60000) {
      toast.error('Scheduled time cannot be in the past');
      return;
    }
    setScheduledStartTime(parsed);
    setPopoverOpen(false);
    toast.success(`Scheduled for ${format(parsed, 'MMM d, h:mm a')}`);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If text remains in "To" field, commit it
    if (toInput.trim()) {
      addRecipient(toInput);
    }

    if (!selectedSenderId) {
      toast.error('Please select a sender');
      return;
    }

    if (recipients.length === 0) {
      toast.error('Please specify at least one recipient');
      return;
    }

    if (!subject.trim()) {
      toast.error('Subject line is required');
      return;
    }

    const htmlContent = editor?.getHTML() || '';
    if (!htmlContent || htmlContent === '<p></p>') {
      toast.error('Email body is required');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        senderId: selectedSenderId,
        subject: subject.trim(),
        bodyHtml: htmlContent,
        recipients,
        startTime: scheduledStartTime ? scheduledStartTime.toISOString() : undefined,
        delayBetweenEmailsSeconds: delaySeconds,
        hourlyLimit,
      };

      const result = await scheduleEmails(payload);
      toast.success(
        `Successfully queued ${result.scheduledCount} email${result.scheduledCount > 1 ? 's' : ''}!`
      );
      navigate('/scheduled');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to schedule emails');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Visible recipient chips (first 4) + overflow
  const visibleRecipients = recipients.slice(0, 4);
  const overflowCount = recipients.length - 4;

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8">
      {/* Top action header */}
      <div className="flex items-center justify-between gap-4 border-b border-surface-border pb-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            id="btn-back-compose"
            onClick={() => navigate('/scheduled')}
            className="p-2 rounded-xl text-gray-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-surface-border transition-all"
            title="Back to Scheduled"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Compose New Email
          </h1>
        </div>

        <div className="flex items-center gap-2 relative">
          {/* Visual Paperclip attachment */}
          <button
            type="button"
            className="p-2 rounded-xl text-gray-500 hover:bg-white hover:text-gray-900 border border-transparent hover:border-surface-border transition-all"
            title="Attach file (visual only)"
            onClick={() => toast('Attachments are visual-only in this demo', { icon: '📎' })}
          >
            <Paperclip size={18} />
          </button>

          {/* Send Later Popover Trigger */}
          <button
            id="btn-send-later-popover"
            type="button"
            onClick={() => setPopoverOpen((o) => !o)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              scheduledStartTime
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-white text-gray-700 border-surface-border hover:bg-surface-muted'
            }`}
          >
            <Clock size={14} className={scheduledStartTime ? 'text-amber-600' : 'text-gray-500'} />
            {scheduledStartTime
              ? format(scheduledStartTime, 'MMM d, h:mm a')
              : 'Send Later'}
            <ChevronDown size={13} className="text-gray-400" />
          </button>

          {/* Send Later Popover Floating Card */}
          {popoverOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-surface-border rounded-2xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between pb-3 border-b border-surface-border mb-3">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Schedule Send
                </h4>
                <button
                  onClick={() => setPopoverOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5 mb-4">
                <button
                  type="button"
                  onClick={() => setQuickPreset('tomorrow')}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-brand-soft hover:text-brand transition-colors flex items-center justify-between"
                >
                  <span>Tomorrow (24 hours later)</span>
                  <Calendar size={13} className="text-gray-400" />
                </button>
                <button
                  type="button"
                  onClick={() => setQuickPreset('9am')}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-brand-soft hover:text-brand transition-colors flex items-center justify-between"
                >
                  <span>Tomorrow, 9:00 AM</span>
                  <Clock size={13} className="text-gray-400" />
                </button>
                <button
                  type="button"
                  onClick={() => setQuickPreset('11am')}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-brand-soft hover:text-brand transition-colors flex items-center justify-between"
                >
                  <span>Tomorrow, 11:00 AM</span>
                  <Clock size={13} className="text-gray-400" />
                </button>
                <button
                  type="button"
                  onClick={() => setQuickPreset('3pm')}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-brand-soft hover:text-brand transition-colors flex items-center justify-between"
                >
                  <span>Tomorrow, 3:00 PM</span>
                  <Clock size={13} className="text-gray-400" />
                </button>
              </div>

              {/* Custom Date/Time input */}
              <div className="mb-4">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Or pick exact date & time
                </label>
                <input
                  type="datetime-local"
                  value={tempDateString}
                  onChange={(e) => setTempDateString(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-surface-border rounded-lg bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-surface-border">
                {scheduledStartTime && (
                  <button
                    type="button"
                    onClick={() => {
                      setScheduledStartTime(null);
                      setPopoverOpen(false);
                      toast('Cleared scheduled time (will send immediately)');
                    }}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Clear
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setPopoverOpen(false)}
                    className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApplyCustomTime}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Primary Submit Button */}
          <Button
            id="btn-submit-schedule"
            type="button"
            onClick={handleSubmit}
            loading={isSubmitting}
            leftIcon={<Send size={15} />}
          >
            {scheduledStartTime ? 'Schedule Batch' : 'Send Immediately'}
          </Button>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Sender (From) */}
        <div className="bg-white border border-surface-border rounded-xl p-3.5 flex items-center gap-3">
          <label className="w-16 text-xs font-semibold text-gray-500 uppercase tracking-wider shrink-0">
            From
          </label>
          <div className="flex-1">
            {isLoadingSenders ? (
              <span className="text-xs text-gray-400">Loading verified senders...</span>
            ) : senders.length === 0 ? (
              <span className="text-xs text-red-500">No senders available (run seed:senders)</span>
            ) : (
              <select
                id="select-sender"
                value={selectedSenderId}
                onChange={(e) => setSelectedSenderId(e.target.value)}
                className="w-full md:w-auto bg-surface-muted border border-surface-border rounded-lg px-3 py-1.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand"
              >
                {senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} &lt;{s.email}&gt;
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Row 2: Recipients (To) + CSV/TXT Upload */}
        <div className="bg-white border border-surface-border rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 flex-1">
              <label className="w-16 text-xs font-semibold text-gray-500 uppercase tracking-wider shrink-0">
                To
              </label>

              {/* Chips + Input container */}
              <div className="flex-1 flex flex-wrap items-center gap-1.5 min-h-[36px]">
                {visibleRecipients.map((email, idx) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 bg-brand-soft border border-brand-light text-brand px-2.5 py-1 rounded-full text-xs font-medium"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => removeRecipient(idx)}
                      className="hover:text-red-600 rounded-full"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}

                {overflowCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllRecipients((o) => !o)}
                    className="inline-flex items-center gap-1 bg-brand text-white px-2.5 py-1 rounded-full text-xs font-bold hover:bg-brand-hover shadow-sm transition-colors"
                    title="Click to view all recipients"
                  >
                    +{overflowCount} more
                  </button>
                )}

                <input
                  id="input-recipient"
                  type="text"
                  placeholder={recipients.length === 0 ? 'Type recipient email & press Enter...' : 'Add more...'}
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  onKeyDown={handleToKeyDown}
                  onBlur={() => {
                    if (toInput.trim()) addRecipient(toInput);
                  }}
                  className="flex-1 min-w-[180px] bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none py-1"
                />
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* Upload List Button */}
            <button
              id="btn-upload-list"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border bg-surface-muted hover:bg-surface-border text-xs font-semibold text-gray-700 transition-colors shrink-0"
              title="Upload CSV or TXT lead list"
            >
              <Upload size={13} className="text-brand" />
              Upload List
            </button>
          </div>

          {/* Expanded all recipients modal/drawer if toggled */}
          {showAllRecipients && (
            <div className="pt-3 border-t border-surface-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-700 uppercase">
                  All Recipients ({recipients.length})
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRecipients([])}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Clear All
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAllRecipients(false)}
                    className="text-xs text-gray-500 hover:text-gray-800"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto flex flex-wrap gap-1.5 p-2 bg-surface-muted rounded-lg">
                {recipients.map((email, idx) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 bg-white border border-surface-border px-2 py-0.5 rounded-md text-xs text-gray-700"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => removeRecipient(idx)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Row 3: Subject */}
        <div className="bg-white border border-surface-border rounded-xl p-3.5 flex items-center gap-3">
          <label className="w-16 text-xs font-semibold text-gray-500 uppercase tracking-wider shrink-0">
            Subject
          </label>
          <input
            id="input-subject"
            type="text"
            placeholder="Subject line..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 bg-transparent text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none"
          />
        </div>

        {/* Row 4: Scheduling Parameters (Delay & Hourly Limit) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-surface-border rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div>
              <label htmlFor="input-delay" className="block text-xs font-semibold text-gray-700">
                Delay Between Emails
              </label>
              <p className="text-[11px] text-gray-400">Paces sends to prevent provider throttling</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                id="input-delay"
                type="number"
                min="0"
                max="3600"
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-16 h-8 text-center text-sm font-semibold border border-surface-border rounded-lg bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <span className="text-xs text-gray-500 font-medium">sec</span>
            </div>
          </div>

          <div className="bg-white border border-surface-border rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div>
              <label htmlFor="input-hourly-limit" className="block text-xs font-semibold text-gray-700">
                Hourly Limit
              </label>
              <p className="text-[11px] text-gray-400">Max emails sent per hour per sender</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                id="input-hourly-limit"
                type="number"
                min="1"
                max="10000"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-16 h-8 text-center text-sm font-semibold border border-surface-border rounded-lg bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <span className="text-xs text-gray-500 font-medium">/ hr</span>
            </div>
          </div>
        </div>

        {/* Row 5: TipTap Rich Text Editor Container */}
        <div className="bg-white border border-surface-border rounded-2xl shadow-sm overflow-hidden">
          {/* Custom TipTap Toolbar */}
          <div className="flex flex-wrap items-center gap-1 p-2 bg-surface-subtle border-b border-surface-border text-gray-600">
            {/* Undo / Redo */}
            <button
              type="button"
              onClick={() => editor?.chain().focus().undo().run()}
              disabled={!editor?.can().undo()}
              className="p-1.5 rounded hover:bg-white hover:text-gray-900 disabled:opacity-30"
              title="Undo"
            >
              <Undo2 size={15} />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().redo().run()}
              disabled={!editor?.can().redo()}
              className="p-1.5 rounded hover:bg-white hover:text-gray-900 disabled:opacity-30"
              title="Redo"
            >
              <Redo2 size={15} />
            </button>

            <div className="w-[1px] h-4 bg-gray-300 mx-1" />

            {/* Heading Formatting */}
            <button
              type="button"
              onClick={() => editor?.chain().focus().setParagraph().run()}
              className={`px-2 py-1 text-xs font-semibold rounded ${
                editor?.isActive('paragraph') ? 'bg-white shadow-sm text-brand' : 'hover:bg-white'
              }`}
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`px-2 py-1 text-xs font-bold rounded ${
                editor?.isActive('heading', { level: 1 }) ? 'bg-white shadow-sm text-brand' : 'hover:bg-white'
              }`}
            >
              H1
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`px-2 py-1 text-xs font-bold rounded ${
                editor?.isActive('heading', { level: 2 }) ? 'bg-white shadow-sm text-brand' : 'hover:bg-white'
              }`}
            >
              H2
            </button>

            <div className="w-[1px] h-4 bg-gray-300 mx-1" />

            {/* Bold, Italic, Underline, Strike */}
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded ${
                editor?.isActive('bold') ? 'bg-white text-brand shadow-sm' : 'hover:bg-white'
              }`}
              title="Bold"
            >
              <BoldIcon size={15} />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded ${
                editor?.isActive('italic') ? 'bg-white text-brand shadow-sm' : 'hover:bg-white'
              }`}
              title="Italic"
            >
              <ItalicIcon size={15} />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              className={`p-1.5 rounded ${
                editor?.isActive('underline') ? 'bg-white text-brand shadow-sm' : 'hover:bg-white'
              }`}
              title="Underline"
            >
              <UnderlineIcon size={15} />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              className={`p-1.5 rounded ${
                editor?.isActive('strike') ? 'bg-white text-brand shadow-sm' : 'hover:bg-white'
              }`}
              title="Strikethrough"
            >
              <StrikeIcon size={15} />
            </button>

            <div className="w-[1px] h-4 bg-gray-300 mx-1" />

            {/* Lists */}
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded ${
                editor?.isActive('bulletList') ? 'bg-white text-brand shadow-sm' : 'hover:bg-white'
              }`}
              title="Bullet List"
            >
              <ListIcon size={15} />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded ${
                editor?.isActive('orderedList') ? 'bg-white text-brand shadow-sm' : 'hover:bg-white'
              }`}
              title="Numbered List"
            >
              <OrderedListIcon size={15} />
            </button>

            <div className="w-[1px] h-4 bg-gray-300 mx-1" />

            {/* Alignments */}
            <button
              type="button"
              onClick={() => editor?.chain().focus().setTextAlign('left').run()}
              className={`p-1.5 rounded ${
                editor?.isActive({ textAlign: 'left' }) ? 'bg-white text-brand shadow-sm' : 'hover:bg-white'
              }`}
              title="Align Left"
            >
              <AlignLeft size={15} />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().setTextAlign('center').run()}
              className={`p-1.5 rounded ${
                editor?.isActive({ textAlign: 'center' }) ? 'bg-white text-brand shadow-sm' : 'hover:bg-white'
              }`}
              title="Align Center"
            >
              <AlignCenter size={15} />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().setTextAlign('right').run()}
              className={`p-1.5 rounded ${
                editor?.isActive({ textAlign: 'right' }) ? 'bg-white text-brand shadow-sm' : 'hover:bg-white'
              }`}
              title="Align Right"
            >
              <AlignRight size={15} />
            </button>

            <div className="w-[1px] h-4 bg-gray-300 mx-1" />

            {/* Quotes, Code, Link */}
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              className={`p-1.5 rounded ${
                editor?.isActive('blockquote') ? 'bg-white text-brand shadow-sm' : 'hover:bg-white'
              }`}
              title="Quote"
            >
              <Quote size={15} />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
              className={`p-1.5 rounded ${
                editor?.isActive('codeBlock') ? 'bg-white text-brand shadow-sm' : 'hover:bg-white'
              }`}
              title="Code Block"
            >
              <Code size={15} />
            </button>
            <button
              type="button"
              onClick={() => {
                const url = window.prompt('Enter URL:');
                if (url) {
                  editor?.chain().focus().setLink({ href: url }).run();
                }
              }}
              className={`p-1.5 rounded ${
                editor?.isActive('link') ? 'bg-white text-brand shadow-sm' : 'hover:bg-white'
              }`}
              title="Insert Link"
            >
              <Link2 size={15} />
            </button>
          </div>

          {/* Editor Content */}
          <EditorContent editor={editor} />
        </div>
      </form>
    </div>
  );
}
