import React from 'react';
import { ShieldCheck, Cpu, Server, Lock, RefreshCw, User as UserIcon, LogOut } from 'lucide-react';
import { PageId } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  activePage: PageId;
  serverOnline: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  onNavigate?: (page: PageId) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  serverOnline,
  onRefresh,
  isRefreshing,
  onNavigate,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleGoProfile = () => {
    if (onNavigate) {
      onNavigate('profile');
    }
    navigate('/profile');
  };

  const pageTitles: Record<PageId, { title: string; subtitle: string }> = {
    overview: {
      title: 'Security & Privacy Overview',
      subtitle: 'Real-time telemetry and privacy gate enforcement status',
    },
    livescreen: {
      title: 'Live Screen Analysis & Redaction',
      subtitle: 'Side-by-side local verification: Raw viewport vs Sanitized payload',
    },
    monitor: {
      title: 'Privacy Events Monitor',
      subtitle: 'Real-time audit log of local PII, DOM, and visual redactions',
    },
    agent: {
      title: 'Vision AI Agent Assistant',
      subtitle: 'Privacy-gated browser automation and safe local action execution',
    },
    performance: {
      title: 'Performance & Privacy Evaluation',
      subtitle: 'Hardware acceleration telemetry, latency waterfall, and F1 metrics',
    },
    activity: {
      title: 'Security Audit Timeline',
      subtitle: 'Step-by-step cryptographic audit trail of agent executions',
    },
    settings: {
      title: 'System Settings & Controls',
      subtitle: 'Configure local AI models, WebGPU acceleration, and privacy gates',
    },
    profile: {
      title: 'Operator Profile & Credentials',
      subtitle: 'Authenticated operator identity and cryptographic session details',
    },
  };

  const current = pageTitles[activePage] || pageTitles.overview;
  const firstName = user?.full_name ? user.full_name.split(' ')[0] : 'Operator';

  return (
    <header className="h-16 bg-[#0B1020]/95 border-b border-[#00E5FF]/20 backdrop-blur-md px-6 flex items-center justify-between fixed top-0 right-0 left-64 z-30 select-none">
      {/* Left: Page Title & System Status */}
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              {current.title}
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              Protected
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Telemetry & Authenticated User Control */}
      <div className="flex items-center gap-3">
        {/* Core Privacy Promise Banner */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] text-[10px] font-bold">
          <Lock className="w-3 h-3" />
          <span>ZERO-LEAK PRIVACY GATE</span>
        </div>

        {/* Server Status Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#050816] border border-slate-700/60 text-slate-300 text-[11px]">
          <Server className={`w-3 h-3 ${serverOnline ? 'text-[#22C55E]' : 'text-[#F59E0B]'}`} />
          <span className="text-[10px] text-slate-400">SERVER:</span>
          <strong className={`text-[10px] ${serverOnline ? 'text-[#22C55E]' : 'text-[#F59E0B]'}`}>
            {serverOnline ? 'CONNECTED' : 'LOCAL'}
          </strong>
        </div>

        {/* User Greeting & Quick Actions */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-white tracking-tight">
              Hello, <span className="text-[#00E5FF]">{firstName}</span>
            </div>
            <div className="text-[9px] font-mono text-[#22C55E]">
              AUTHENTICATED
            </div>
          </div>

          {/* Profile Button */}
          <button
            onClick={handleGoProfile}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activePage === 'profile'
                ? 'bg-[#00E5FF]/20 border-[#00E5FF] text-[#00E5FF]'
                : 'bg-[#050816] border-slate-700 text-slate-300 hover:border-[#00E5FF] hover:text-[#00E5FF]'
            }`}
            title="User Profile"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Profile</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="px-2.5 py-1.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/20 hover:border-[#EF4444] transition-all text-xs font-semibold flex items-center gap-1.5"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Logout</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg bg-[#050816] border border-[#00E5FF]/30 text-[#00E5FF] hover:bg-[#00E5FF]/20 hover:border-[#00E5FF] transition-all ml-1"
            title="Refresh metrics and events"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
