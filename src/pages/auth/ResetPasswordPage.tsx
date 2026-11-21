import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, KeyRound, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { resetPassword } = useAuth();

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!token.trim()) {
      setError('Please provide a valid password reset token.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const res = await resetPassword(token, newPassword, confirmPassword);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage(res.message);
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } else {
      setError(res.message || 'Password reset failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#050816] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-[#7C3AED]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#0B1020]/90 border border-[#00E5FF]/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_20px_rgba(0,229,255,0.15)] backdrop-blur-xl">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#050816] border border-[#00E5FF] flex items-center justify-center text-2xl mx-auto shadow-[0_0_20px_rgba(0,229,255,0.3)] mb-2.5">
              🛡️
            </div>
            <h1 className="text-xl font-black tracking-wider text-white uppercase">
              RESET PASSWORD
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Set new credentials for your Shield-Agent account.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444] text-xs font-mono flex items-center gap-2 animate-fade-in">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#22C55E] text-xs font-mono flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage} Redirecting to login...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Reset Token
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste reset token..."
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#050816] border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00E5FF] font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#050816] border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00E5FF] font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#050816] border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00E5FF] font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#22C55E] text-[#050816] font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer mt-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Update Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Remember your credentials?{' '}
            <Link to="/login" className="text-[#00E5FF] font-bold hover:underline cursor-pointer">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
