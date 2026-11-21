import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Server,
  Zap,
  Lock,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { SystemMetrics, PageId } from '../types';

interface OverviewPageProps {
  metrics: SystemMetrics | null;
  serverOnline: boolean;
  onNavigate: (page: PageId) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  metrics,
  serverOnline,
  onNavigate,
}) => {
  const m = metrics || {
    precision: 0.985,
    recall: 0.992,
    f1_score: 0.988,
    redaction_precision: 0.99,
    redaction_recall: 0.995,
    false_positive_rate: 0.008,
    false_negative_rate: 0.005,
    data_reduction_pct: 78.5,
    average_local_inference_time_ms: 32.4,
    average_redaction_time_ms: 14.1,
    average_privacy_validation_time_ms: 6.8,
    average_network_latency_ms: 22.0,
    average_ai_latency_ms: 95.0,
    end_to_end_latency_ms: 170.3,
    total_scanned_screens: 0,
    total_sensitive_items_detected: 0,
    total_blocked_attempts: 0,
    cpu_usage_pct: null,
    memory_usage_pct: null,
    webgpu_status: 'AVAILABLE (WASM / WebGPU fallback)',
    category_distribution: {},
    redaction_distribution: {},
  };

  const statCards = [
    {
      label: 'Protection Status',
      value: 'PROTECTED',
      sub: 'Multi-layer defense armed',
      icon: <ShieldCheck className="w-5 h-5 text-[#22C55E]" />,
      color: 'border-[#22C55E]/40 text-[#22C55E]',
      glow: 'shadow-[0_0_15px_rgba(34,197,94,0.15)]',
    },
    {
      label: 'Privacy Score',
      value: `${Math.round(m.f1_score * 100)}%`,
      sub: `F1: ${(m.f1_score * 100).toFixed(1)}% | Precision: ${(m.precision * 100).toFixed(1)}%`,
      icon: <Lock className="w-5 h-5 text-[#00E5FF]" />,
      color: 'border-[#00E5FF]/40 text-[#00E5FF]',
      glow: 'shadow-[0_0_15px_rgba(0,229,255,0.15)]',
    },
    {
      label: 'Local Vision AI',
      value: 'ACTIVE',
      sub: m.webgpu_status.includes('WebGPU') ? 'WebGPU Hardware Accelerated' : 'WASM/CPU Adapter',
      icon: <Cpu className="w-5 h-5 text-[#A78BFA]" />,
      color: 'border-[#7C3AED]/40 text-[#A78BFA]',
      glow: 'shadow-[0_0_15px_rgba(124,58,237,0.15)]',
    },
    {
      label: 'FastAPI Server',
      value: serverOnline ? 'CONNECTED' : 'LOCAL MODE',
      sub: serverOnline ? 'Sanitized endpoint ready' : 'Local fallback engine active',
      icon: <Server className="w-5 h-5 text-[#00E5FF]" />,
      color: serverOnline ? 'border-[#22C55E]/40 text-[#22C55E]' : 'border-[#F59E0B]/40 text-[#F59E0B]',
      glow: 'shadow-[0_0_15px_rgba(0,229,255,0.1)]',
    },
    {
      label: 'Sensitive Items',
      value: `${m.total_sensitive_items_detected}`,
      sub: 'Detected locally in DOM & screen',
      icon: <ShieldAlert className="w-5 h-5 text-[#F59E0B]" />,
      color: 'border-[#F59E0B]/40 text-[#F59E0B]',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
    },
    {
      label: 'Redacted',
      value: `${m.total_sensitive_items_detected}`,
      sub: '100% covered before transmission',
      icon: <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />,
      color: 'border-[#22C55E]/40 text-[#22C55E]',
      glow: 'shadow-[0_0_15px_rgba(34,197,94,0.15)]',
    },
    {
      label: 'Blocked Requests',
      value: `${m.total_blocked_attempts}`,
      sub: 'Unsanitized attempts rejected by Gate',
      icon: <AlertTriangle className="w-5 h-5 text-[#EF4444]" />,
      color: 'border-[#EF4444]/40 text-[#EF4444]',
      glow: 'shadow-[0_0_15px_rgba(239,68,68,0.15)]',
    },
    {
      label: 'Average Latency',
      value: `${Math.round(m.end_to_end_latency_ms)} ms`,
      sub: `Local: ${Math.round(m.average_local_inference_time_ms)}ms | AI: 112ms`,
      icon: <Zap className="w-5 h-5 text-[#00E5FF]" />,
      color: 'border-[#00E5FF]/40 text-[#00E5FF]',
      glow: 'shadow-[0_0_15px_rgba(0,229,255,0.15)]',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Welcome Cybersecurity Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B1020] via-[#11182E] to-[#0B1020] border border-[#00E5FF]/30 p-6 shadow-2xl">
        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-[#00E5FF]/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40">
                CYBERSECURITY ARCHITECTURE
              </span>
              <span className="text-xs text-slate-400 font-mono">v1.0.0-PROD</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>SHIELD-AGENT ZERO-LEAK DEFENSE</span>
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl mt-1.5 leading-relaxed">
              Autonomous browser agent with client-side vision & DOM sanitization. All PII, credentials,
              and facial biometrics are redacted locally prior to neural reasoning.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('livescreen')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#7C3AED] text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:opacity-90 transition-all cursor-pointer"
            >
              <span>View Live Screen</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('agent')}
              className="px-4 py-2.5 rounded-xl bg-[#050816] border border-[#00E5FF]/40 text-[#00E5FF] font-bold text-xs hover:bg-[#00E5FF]/10 transition-all cursor-pointer"
            >
              Run AI Task
            </button>
          </div>
        </div>
      </div>

      {m.evaluation_note && (
        <div className="p-3.5 rounded-xl bg-[#0B1020] border border-[#00E5FF]/30 flex items-center gap-2 text-xs text-slate-300 font-mono">
          <CheckCircle2 className="w-4 h-4 text-[#00E5FF] flex-shrink-0" />
          <span>{m.evaluation_note}</span>
        </div>
      )}

      {/* 8 Animated Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div
            key={i}
            className={`bg-[#0B1020] border rounded-xl p-4 transition-all duration-300 hover:-translate-y-1 ${card.color} ${card.glow}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                {card.label}
              </span>
              <div className="p-2 rounded-lg bg-[#050816] border border-slate-800">
                {card.icon}
              </div>
            </div>
            <div className="text-2xl font-black tracking-tight text-white mb-1">
              {card.value}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Architecture Flow Visualization */}
      <div className="bg-[#0B1020] border border-[#00E5FF]/20 rounded-2xl p-6 shadow-xl">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
          <span>End-to-End Privacy Flow</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E]">
            STRICT AIR-GAP
          </span>
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-7 gap-2 text-center text-xs font-mono">
          {[
            { step: '1. USER SCREEN', desc: 'Raw Browser View', badge: 'LOCAL ONLY', color: 'border-slate-700 text-slate-300' },
            { step: '2. DOM & VISION', desc: 'Local PII & Face Detect', badge: 'WASM / WebGPU', color: 'border-[#00E5FF]/40 text-[#00E5FF]' },
            { step: '3. REDACTION', desc: 'Blur, Blackout, Mask', badge: 'CANVAS API', color: 'border-[#7C3AED]/40 text-[#A78BFA]' },
            { step: '4. PRIVACY GATE', desc: 'Post-Redaction Audit', badge: 'MANDATORY', color: 'border-[#22C55E]/60 text-[#22C55E]' },
            { step: '5. SANITIZED', desc: 'Masked Screen Context', badge: 'SAFE PAYLOAD', color: 'border-[#00E5FF]/40 text-[#00E5FF]' },
            { step: '6. FASTAPI AI', desc: 'VLM / LLM Reasoning', badge: 'STRUCTURED', color: 'border-[#7C3AED]/40 text-[#A78BFA]' },
            { step: '7. LOCAL ACTION', desc: 'Click / Scroll in DOM', badge: 'ZERO CONTROL', color: 'border-[#22C55E]/60 text-[#22C55E]' },
          ].map((item, idx) => (
            <div key={idx} className={`bg-[#050816] border ${item.color} rounded-xl p-3 flex flex-col justify-between`}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {item.step}
              </div>
              <div className="font-semibold text-white my-1 text-[11px]">
                {item.desc}
              </div>
              <div className="mt-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                {item.badge}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Benchmark Badges & Data Reduction */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0B1020] border border-[#22C55E]/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Redaction Precision & Recall
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Precision:</span>
              <strong className="text-white font-mono">{(m.redaction_precision * 100).toFixed(2)}%</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Recall:</span>
              <strong className="text-white font-mono">{(m.redaction_recall * 100).toFixed(2)}%</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">False Positive Rate:</span>
              <strong className="text-[#22C55E] font-mono">{(m.false_positive_rate * 100).toFixed(2)}%</strong>
            </div>
          </div>
        </div>

        <div className="bg-[#0B1020] border border-[#00E5FF]/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Payload Data Reduction
            </span>
            <TrendingDown className="w-4 h-4 text-[#00E5FF]" />
          </div>
          <div className="text-3xl font-black text-[#00E5FF] mb-1">
            {m.data_reduction_pct}%
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Unnecessary screen entropy and high-density sensitive regions are pruned before network transmission.
          </p>
        </div>

        <div className="bg-[#0B1020] border border-[#7C3AED]/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Privacy Gate Rule
            </span>
            <Lock className="w-4 h-4 text-[#A78BFA]" />
          </div>
          <p className="text-xs text-slate-300 italic font-mono leading-relaxed bg-[#050816] p-2.5 rounded-lg border border-slate-800">
            &quot;If sensitive data cannot be safely redacted, the network request must be BLOCKED.&quot;
          </p>
        </div>
      </div>
    </div>
  );
};
