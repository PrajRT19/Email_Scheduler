import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Send, PenSquare, ChevronDown, LogOut, Slack, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSearchQuery } from '../hooks/useSearch';
import { getEmailCounts, getSlackStatus, disconnectSlack } from '../api/endpoints';
import { Avatar } from '../components/ui';
import toast from 'react-hot-toast';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { raw, query, onChange: onSearchChange } = useSearchQuery();

  const { data: counts } = useQuery({
    queryKey: ['email', 'counts'],
    queryFn: getEmailCounts,
    refetchInterval: 30_000,
  });

  const { data: slackStatus } = useQuery({
    queryKey: ['slack', 'status'],
    queryFn: getSlackStatus,
    staleTime: 60_000,
  });

  const handleSlackDisconnect = async () => {
    try {
      await disconnectSlack();
      queryClient.invalidateQueries({ queryKey: ['slack', 'status'] });
      toast.success('Slack disconnected');
    } catch {
      toast.error('Failed to disconnect Slack');
    }
  };

  const handleSlackConnect = () => {
    const base = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:4000';
    window.location.href = `${base}/api/slack/connect`;
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['emails'] });
    queryClient.invalidateQueries({ queryKey: ['email', 'counts'] });
  };

  const navLinks = [
    {
      to: '/scheduled',
      label: 'Scheduled',
      icon: <Mail size={16} />,
      count: counts?.scheduled,
      id: 'nav-scheduled',
    },
    {
      to: '/sent',
      label: 'Sent',
      icon: <Send size={16} />,
      count: counts?.sent,
      id: 'nav-sent',
    },
  ];

  return (
    <div className="flex h-screen bg-surface-bg overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col bg-white border-r border-surface-border flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-surface-border">
          <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 tracking-tight text-base">ReachInbox</span>
        </div>

        {/* Compose Button */}
        <div className="px-4 py-4">
          <button
            id="btn-compose"
            onClick={() => navigate('/compose')}
            className="w-full flex items-center justify-center gap-2 bg-brand text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-brand-hover active:bg-brand-active transition-colors shadow-sm"
          >
            <PenSquare size={15} />
            Compose
          </button>
        </div>

        {/* CORE label */}
        <div className="px-5 pb-1">
          <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Core</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              id={link.id}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group ${
                  isActive
                    ? 'bg-brand-soft text-brand'
                    : 'text-gray-600 hover:bg-surface-muted hover:text-gray-900'
                }`
              }
            >
              <span className="flex items-center gap-2.5">
                {link.icon}
                {link.label}
              </span>
              {link.count !== undefined && (
                <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {link.count > 999 ? '999+' : link.count}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Card */}
        <div className="border-t border-surface-border p-3 relative">
          <button
            id="btn-user-menu"
            onClick={() => setUserMenuOpen((o) => !o)}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-surface-muted transition-colors"
          >
            <Avatar name={user?.name || 'User'} avatarUrl={user?.avatarUrl} size={32} />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <ChevronDown size={14} className={`text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {userMenuOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-1 bg-white border border-surface-border rounded-xl shadow-lg overflow-hidden z-50">
              {slackStatus?.connected ? (
                <button
                  id="btn-slack-disconnect"
                  onClick={() => { handleSlackDisconnect(); setUserMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-surface-muted transition-colors"
                >
                  <Slack size={15} className="text-purple-500" />
                  Disconnect Slack
                  <span className="ml-auto text-xs text-status-sentText bg-status-sentBg px-1.5 py-0.5 rounded-full">Connected</span>
                </button>
              ) : (
                <button
                  id="btn-slack-connect"
                  onClick={() => { handleSlackConnect(); setUserMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-surface-muted transition-colors"
                >
                  <Slack size={15} className="text-purple-500" />
                  Connect Slack
                </button>
              )}
              <div className="border-t border-surface-border" />
              <button
                id="btn-logout"
                onClick={() => { logout(); setUserMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={15} />
                Log out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-surface-border flex items-center gap-4 px-6 flex-shrink-0">
          {/* Search */}
          <div className="flex-1 max-w-lg relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              id="input-search"
              type="text"
              placeholder="Search emails..."
              value={raw}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-9 pl-9 pr-4 bg-surface-muted border border-surface-border rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              id="btn-filter"
              className="p-2 rounded-lg text-gray-500 hover:bg-surface-muted hover:text-gray-900 transition-colors"
              title="Filter"
            >
              <SlidersHorizontal size={16} />
            </button>
            <button
              id="btn-refresh"
              onClick={handleRefresh}
              className="p-2 rounded-lg text-gray-500 hover:bg-surface-muted hover:text-gray-900 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Pass search query via context-like prop approach using URL params */}
          <Outlet context={{ query }} />
        </main>
      </div>
    </div>
  );
}
