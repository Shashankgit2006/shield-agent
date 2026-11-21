import React from 'react';
import {
  LayoutDashboard,
  Eye,
  ShieldCheck,
  Bot,
  Zap,
  History,
  Settings,
  Lock,
} from 'lucide-react';
import { PageId } from '../types';

interface SidebarProps {
  activePage: PageId;
  onSelectPage: (page: PageId) => void;
  serverOnline: boolean;
  privacyArmed: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onSelectPage,
  serverOnline,
  privacyArmed,
}) => {
  const navItems: Array<{ id: PageId; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'livescreen', label: 'Live Screen', icon: <Eye className="w-4 h-4" />, badge: 'LIVE' },
    { id: 'monitor', label: 'Privacy Monitor', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'agent', label: 'AI Agent', icon: <Bot className="w-4 h-4" /> },
    { id: 'performance', label: 'Performance', icon: <Zap className="w-4 h-4" /> },
    { id: 'activity', label: 'Activity', icon: <History className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile', icon: <Lock className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-64 bg-[#0B1020] border-r border-[#00E5FF]/20 flex flex-col justify-between h-screen fixed left-0 top-0 z-40 select-none">
      {/* Top Header */}
      <div>
        <div className="p-5 border-b border-[#00E5FF]/15 bg-gradient-to-b from-[#00E5FF]/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#050816] border border-[#00E5FF] flex items-center justify-center text-xl shadow-[0_0_15px_rgba(0,229,255,0.4)]">
              🛡️
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-wider text-white flex items-center gap-1.5">
                SHIELD-AGENT
              </h1>
              <p className="text-[10px] text-[#00E5FF] font-medium tracking-wide">
                Privacy-Preserving Vision AI
              </p>
            </div>
          </div>

          {/* System Protection Badge */}
          <div className="mt-4 flex items-center justify-between px-3 py-1.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] text-[11px] font-semibold tracking-wide">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]"></span>
              </span>
              <span>SYSTEM PROTECTED</span>
            </div>
            <span className="text-[10px] opacity-75">100% LOCAL</span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectPage(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/50 shadow-[0_0_12px_rgba(0,229,255,0.25)] translate-x-1'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-[#00E5FF]' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#7C3AED]/20 border border-[#7C3AED]/40 text-[#A78BFA] font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Privacy Seal Card */}
      <div className="p-4 border-t border-[#00E5FF]/15 bg-[#050816]/70">
        <div className="bg-[#050816] border border-[#00E5FF]/30 rounded-xl p-3.5 shadow-inner">
          <div className="flex items-center gap-2 text-[#00E5FF] mb-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold tracking-wider uppercase">
              Zero-Leak Guarantee
            </span>
          </div>
          <p className="text-[10px] text-slate-300 font-medium leading-relaxed">
            Raw sensitive information is strictly processed in local memory.
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>GATE: <strong className="text-[#22C55E]">ENFORCED</strong></span>
            <span>API: <strong className={serverOnline ? 'text-[#22C55E]' : 'text-[#F59E0B]'}>
              {serverOnline ? 'ONLINE' : 'LOCAL'}
            </strong></span>
          </div>
        </div>
      </div>
    </aside>
  );
};
