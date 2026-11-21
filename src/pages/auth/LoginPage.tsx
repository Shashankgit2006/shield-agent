import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, Shield, AlertTriangle, ArrowRight, KeyRound, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password, rememberMe);
    setIsSubmitting(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Invalid email or password.');
    }
  };

  const handleFillDemo = () => {
    setEmail('demo@shieldagent.local');
    setPassword('DemoShield#2026!');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#050816] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Cyber Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00E5FF]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#7C3AED]/15 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Glassmorphic Cyber Card */}
        <div className="bg-[#0B1020]/90 border border-[#00E5FF]/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_20px_rgba(0,229,255,0.15)] backdrop-blur-xl">
          {/* Header Brand */}
          <div className="text-center mb-7">
            <div className="w-14 h-14 rounded-2xl bg-[#050816] border border-[#00E5FF] flex items-center justify-center text-3xl mx-auto shadow-[0_0_25px_rgba(0,229,255,0.4)] mb-3">
              🛡️
            </div>
            <h1 className="text-xl font-black tracking-wider text-white uppercase flex items-center justify-center gap-2">
              <span>SHIELD-AGENT</span>
            </h1>
            <p className="text-xs text-[#00E5FF] font-medium tracking-wide mt-0.5">
              Privacy-Preserving Vision AI
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] text-[10px] font-mono font-bold">
              <Lock className="w-3 h-3" />
              <span>AIRTIGHT LOCAL AUTHENTICATION</span>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444] text-xs font-mono flex items-center gap-2 animate-fade-in">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agent@shield.org"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#050816] border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00E5FF] font-medium transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-[#00E5FF] hover:underline cursor-pointer"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#050816] border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00E5FF] font-mono transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#00E5FF] cursor-pointer"
                />
                <span>Remember me</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#7C3AED] text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer mt-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Development Demo Credentials Box */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="bg-[#050816] border border-[#00E5FF]/20 rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-wider flex items-center gap-1 font-mono">
                  <Sparkles className="w-3 h-3" />
                  <span>DEVELOPMENT ONLY DEMO ACCOUNT</span>
                </span>
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="text-[10px] text-[#00E5FF] font-mono hover:underline cursor-pointer"
                >
                  [Auto-Fill]
                </button>
              </div>
              <div className="text-[11px] font-mono text-slate-300 space-y-0.5">
                <div>Email: <strong className="text-white">demo@shieldagent.local</strong></div>
                <div>Pass: <strong className="text-white">DemoShield#2026!</strong></div>
              </div>
            </div>
          </div>

          {/* Bottom Link */}
          <div className="mt-5 text-center text-xs text-slate-400">
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="text-[#00E5FF] font-bold hover:underline cursor-pointer"
            >
              Create Account
            </Link>
          </div>
        </div>

        {/* Security Footer Guarantee */}
        <p className="text-center text-[11px] text-slate-500 mt-4 font-mono">
          🔒 Zero-Leak Guarantee: Authentication data is strictly isolated from browser screen perception.
        </p>
      </div>
    </div>
  );
};
