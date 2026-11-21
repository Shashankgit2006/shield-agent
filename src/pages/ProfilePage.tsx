import React from 'react';
import { User as UserIcon, Mail, Calendar, ShieldCheck, LogOut, KeyRound, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formattedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Active Session';

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header Card */}
      <div className="bg-[#0B1020] border border-[#00E5FF]/20 rounded-2xl p-6 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#050816] border border-[#00E5FF] flex items-center justify-center text-2xl font-bold text-[#00E5FF] shadow-[0_0_20px_rgba(0,229,255,0.3)]">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-wide">
              {user?.full_name || 'Operator'}
            </h3>
            <p className="text-xs text-[#00E5FF] font-mono">
              ROLE: PRIVACY AGENT OPERATOR
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="px-4 py-2.5 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444] hover:bg-[#EF4444]/25 transition-all text-xs font-bold font-mono flex items-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Profile Details Grid */}
      <div className="bg-[#0B1020] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
          <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
          <span>Authenticated Account Credentials</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-[#050816] border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-[#00E5FF]" /> Legal Name
            </span>
            <strong className="text-white text-sm block">
              {user?.full_name || '—'}
            </strong>
          </div>

          <div className="p-4 rounded-xl bg-[#050816] border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#00E5FF]" /> Registered Email
            </span>
            <strong className="text-white text-sm block">
              {user?.email || '—'}
            </strong>
          </div>

          <div className="p-4 rounded-xl bg-[#050816] border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#7C3AED]" /> Account Created
            </span>
            <strong className="text-slate-300 text-xs block">
              {formattedDate}
            </strong>
          </div>

          <div className="p-4 rounded-xl bg-[#050816] border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#22C55E]" /> Session Status
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] shadow-[0_0_8px_#22C55E]" />
              <strong className="text-[#22C55E] text-xs">
                VERIFIED (JWT HS256)
              </strong>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="p-4 rounded-xl bg-[#050816] border border-[#00E5FF]/20 text-[11px] text-slate-400 flex items-start gap-3">
          <Lock className="w-4 h-4 text-[#00E5FF] flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Security Architecture Guarantee:</strong> Passwords are never stored in plain text (bcrypt cost 12).
            Authentication state is completely isolated from browser vision contexts.
          </p>
        </div>
      </div>
    </div>
  );
};
