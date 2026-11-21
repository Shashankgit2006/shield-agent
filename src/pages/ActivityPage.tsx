import React, { useState, useEffect } from 'react';
import {
  History,
  CheckCircle2,
  Lock,
  Camera,
  ShieldCheck,
  Send,
  Cpu,
  Play,
  Filter,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { TimelineItem, TaskHistoryItem, PrivacyEvent, ScanRecord } from '../types';
import { fetchTasksHistory, fetchPrivacyEvents, fetchLatestScan } from '../services/api';

export const ActivityPage: React.FC = () => {
  const [filter, setFilter] = useState<'ALL' | 'VERIFIED' | 'BLOCKED'>('ALL');
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAuditData();
  }, []);

  const loadAuditData = async () => {
    setIsLoading(true);
    try {
      const [tasks, events, latestScan] = await Promise.all([
        fetchTasksHistory(30),
        fetchPrivacyEvents(30),
        fetchLatestScan(),
      ]);

      const timeline: TimelineItem[] = [];

      // Convert latest scan into audit entries
      if (latestScan) {
        const detectedCount = latestScan.redacted_elements.length;
        const localInf = latestScan.timing_breakdown?.local_inference_ms ?? 0;
        const domBytes = JSON.stringify(latestScan.dom_summary || {}).length;

        timeline.push({
          id: `scan-${latestScan.id}`,
          timestamp: new Date(latestScan.timestamp).toLocaleTimeString(),
          title: `Browser Scan Executed (${latestScan.url || 'Webpage'})`,
          description: `Identified ${detectedCount} sensitive fields, successfully applied ${latestScan.redacted_items_count} redactions. PrivacyGate status: ${latestScan.privacy_gate_status}.`,
          status: latestScan.privacy_gate_status === 'VERIFIED_SAFE' || latestScan.privacy_gate_status === 'PASSED' ? 'verified' : 'blocked',
          category: 'LOCAL_CAPTURE',
          metadata: {
            url: latestScan.url,
            detected: detectedCount,
            redacted: latestScan.redacted_items_count,
            payloadSize: `${domBytes} bytes`,
            localDuration: `${localInf.toFixed(1)} ms`,
          },
        });
      }

      // Convert privacy events into audit entries
      events.forEach((ev) => {
        timeline.push({
          id: `ev-${ev.id}`,
          timestamp: new Date(ev.timestamp).toLocaleTimeString(),
          title: `Privacy Gate: ${ev.action || 'INSPECTION'}`,
          description: `Sensitive data inspected. Category: ${ev.category}`,
          status: ev.status === 'BLOCKED' ? 'blocked' : 'verified',
          category: ev.status === 'BLOCKED' ? 'HARD_BLACKOUT' : 'PRIVACY_GATE',
          metadata: {
            category: ev.category,
            confidence: `${(ev.confidence * 100).toFixed(0)}%`,
            status: ev.status,
            ...(ev.metadata || {}),
          },
        });
      });

      // Convert task history into audit entries
      tasks.forEach((t) => {
        timeline.push({
          id: `task-${t.id}`,
          timestamp: new Date(t.timestamp).toLocaleTimeString(),
          title: `AI Action Planned: ${t.action_type.toUpperCase()} → ${t.action_target}`,
          description: `Instruction: "${t.task_instruction}". Grounding reason: ${t.reason}`,
          status: t.privacy_gate_verified ? 'completed' : 'blocked',
          category: 'AI_REASONING',
          metadata: {
            action: t.action_type,
            target: t.action_target,
            confidence: `${(t.confidence * 100).toFixed(0)}%`,
            latency: `${t.total_latency_ms.toFixed(0)} ms`,
          },
        });
      });

      // Sort chronological descending
      timeline.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      setItems(timeline);
    } catch (err) {
      console.warn('Notice loading audit data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = items.filter((e) => {
    if (filter === 'VERIFIED') return e.status === 'verified' || e.status === 'completed';
    if (filter === 'BLOCKED') return e.status === 'blocked';
    return true;
  });

  const getStepIcon = (category: string) => {
    switch (category) {
      case 'LOCAL_CAPTURE':
        return <Camera className="w-4 h-4 text-[#00E5FF]" />;
      case 'DETECTION':
      case 'REDACTION':
        return <Lock className="w-4 h-4 text-[#7C3AED]" />;
      case 'HARD_BLACKOUT':
        return <ShieldCheck className="w-4 h-4 text-[#EF4444]" />;
      case 'PRIVACY_GATE':
        return <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />;
      case 'NETWORK':
        return <Send className="w-4 h-4 text-[#00E5FF]" />;
      case 'AI_REASONING':
        return <Cpu className="w-4 h-4 text-[#A78BFA]" />;
      case 'SAFETY_POLICY':
      case 'EXECUTION':
        return <Play className="w-4 h-4 text-[#22C55E]" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0B1020] border border-[#00E5FF]/20 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-[#050816] border border-[#00E5FF]/40 text-[#00E5FF]">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white tracking-wide uppercase">
              Security Audit Timeline (Live Database Records)
            </h3>
            <p className="text-xs text-slate-400">
              Chronological audit trail of live scans, PrivacyGate validations, and AI reasoning tasks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAuditData}
            title="Refresh Audit Trail"
            className="p-2 rounded-xl bg-[#050816] border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Filter */}
          <div className="flex items-center gap-1.5 bg-[#050816] p-1 rounded-lg border border-slate-800 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            {(['ALL', 'VERIFIED', 'BLOCKED'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                  filter === f
                    ? 'bg-[#00E5FF] text-[#050816] shadow-[0_0_8px_rgba(0,229,255,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Chain */}
      <div className="bg-[#0B1020] border border-[#00E5FF]/20 rounded-2xl p-6 shadow-2xl">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500 font-mono text-xs space-y-2">
            <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-300 font-bold">No activity records found in the database yet.</p>
            <p className="text-slate-500 max-w-md mx-auto">
              Open the Shield-Agent extension on any website (or test with <code className="text-[#00E5FF]">http://localhost:3000/demo.html</code>) and click &quot;Start Local Scan &amp; Agent Task&quot; to populate genuine audit records.
            </p>
          </div>
        ) : (
          <div className="relative border-l-2 border-[#00E5FF]/30 ml-4 pl-6 space-y-6">
            {filtered.map((item, idx) => (
              <div key={item.id} className="relative group">
                {/* Dot Icon Indicator */}
                <div className="absolute -left-[35px] top-1 w-6 h-6 rounded-full bg-[#050816] border-2 border-[#00E5FF] flex items-center justify-center shadow-[0_0_10px_rgba(0,229,255,0.5)] group-hover:scale-110 transition-all">
                  {getStepIcon(item.category)}
                </div>

                {/* Event Content Box */}
                <div className="bg-[#050816] border border-slate-800 hover:border-[#00E5FF]/50 rounded-xl p-4 transition-all duration-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-[#00E5FF] font-bold">
                        EVENT {idx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-white tracking-wide">
                        {item.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400">
                        {item.timestamp}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                          item.status === 'verified'
                            ? 'bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#22C55E]'
                            : item.status === 'blocked'
                            ? 'bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444]'
                            : 'bg-[#00E5FF]/15 border border-[#00E5FF]/40 text-[#00E5FF]'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    {item.description}
                  </p>

                  {item.metadata && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap gap-2 text-[10px] font-mono text-slate-400">
                      {Object.entries(item.metadata).map(([k, v]) => (
                        <span key={k} className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {k}: <strong className="text-slate-200">{Array.isArray(v) ? v.join(', ') : String(v)}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
