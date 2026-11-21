import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, Sparkles, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  const { forgotPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResponseMessage(null);
    setDevResetToken(null);

    const res = await forgotPassword(email);
    setIsSubmitting(false);

    setResponseMessage(res.message);
    if (res.devResetToken) {
      setDevResetToken(res.devResetToken);
    }
  };

  return (
    <div className="min-h-screen bg-[#050816] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-[#00E5FF]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#0B1020]/90 border border-[#00E5FF]/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_20px_rgba(0,229,255,0.15)] backdrop-blur-xl">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#050816] border border-[#00E5FF] flex items-center justify-center text-2xl mx-auto shadow-[0_0_20px_rgba(0,229,255,0.3)] mb-2.5">
              🔑
            </div>
            <h1 className="text-xl font-black tracking-wider text-white uppercase">
              PASSWORD RECOVERY
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Enter your verified email to dispatch cryptographic reset credentials.
            </p>
          </div>

          {responseMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#22C55E] text-xs font-mono flex items-start gap-2.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{responseMessage}</span>
            </div>
          )}

          {/* Development Quick Reset Box if token was returned */}
          {devResetToken && (
            <div className="mb-5 p-4 rounded-xl bg-[#050816] border border-[#00E5FF]/40 text-xs font-mono space-y-2 animate-fade-in">
              <div className="flex items-center gap-1.5 text-[#F59E0B] font-bold text-[10px] uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>DEVELOPMENT RESET LINK (MVP ONLY)</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                A development reset token was generated. Click below to proceed to the reset form:
              </p>
              <Link
                to={`/reset-password?token=${encodeURIComponent(devResetToken)}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00E5FF]/15 border border-[#00E5FF]/50 text-[#00E5FF] font-bold hover:bg-[#00E5FF]/25 transition-all text-xs"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Open Password Reset Form →</span>
              </Link>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Account Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agent@shield.org"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#050816] border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00E5FF] font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#7C3AED] text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
