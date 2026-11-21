import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, User, AlertTriangle, ArrowRight, CheckCircle2, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return { score: 0, label: 'None', color: 'bg-slate-700' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    switch (score) {
      case 1:
        return { score: 25, label: 'Weak', color: 'bg-[#EF4444]' };
      case 2:
        return { score: 50, label: 'Fair', color: 'bg-[#F59E0B]' };
      case 3:
        return { score: 75, label: 'Strong', color: 'bg-[#00E5FF]' };
      case 4:
        return { score: 100, label: 'Military-Grade', color: 'bg-[#22C55E]' };
      default:
        return { score: 10, label: 'Insecure', color: 'bg-[#EF4444]' };
    }
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const result = await register(fullName, email, password, confirmPassword);
    setIsSubmitting(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Registration failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#050816] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#00E5FF]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-[#7C3AED]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#0B1020]/90 border border-[#00E5FF]/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_20px_rgba(0,229,255,0.15)] backdrop-blur-xl">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#050816] border border-[#00E5FF] flex items-center justify-center text-2xl mx-auto shadow-[0_0_20px_rgba(0,229,255,0.3)] mb-2.5">
              🛡️
            </div>
            <h1 className="text-xl font-black tracking-wider text-white uppercase">
              CREATE SHIELD ACCOUNT
            </h1>
            <p className="text-xs text-[#00E5FF] font-medium tracking-wide">
              Provision Your Privacy-Preserving Agent
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444] text-xs font-mono flex items-center gap-2 animate-fade-in">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Shashank Kumar"
                  required
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#050816] border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00E5FF] font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="shashank@shield.org"
                  required
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#050816] border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00E5FF] font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#050816] border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00E5FF] font-mono"
                />
              </div>

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Strength:</span>
                    <span className="text-white font-bold">{strength.label}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${strength.score}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#050816] border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00E5FF] font-mono"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#7C3AED] text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-5 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[#00E5FF] font-bold hover:underline cursor-pointer"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
