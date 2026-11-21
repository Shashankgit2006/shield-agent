import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { PrivacyEvent } from '../types';

interface PrivacyMonitorPageProps {
  events: PrivacyEvent[];
}

export const PrivacyMonitorPage: React.FC<PrivacyMonitorPageProps> = ({ events }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = ['ALL', 'PASSWORD', 'EMAIL', 'PHONE', 'FACE', 'CREDIT_CARD', 'AADHAAR', 'PAN', 'UPI'];

  const filteredEvents = events.filter((ev) => {
    const matchesCategory = selectedCategory === 'ALL' || ev.category.toUpperCase() === selectedCategory;
    const matchesSearch =
      ev.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.element_type && ev.element_type.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const downloadJsonLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredEvents, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `shield-agent-privacy-events-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#0B1020] border border-[#00E5FF]/20 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-[#050816] border border-[#00E5FF]/40 text-[#00E5FF]">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white tracking-wide uppercase flex items-center gap-2">
              <span>Real-Time Privacy Defense Log</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#22C55E] font-bold">
                ZERO RAW PII LOGGED
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Cryptographically verified record of local redaction decisions. Actual user data is never persisted.
            </p>
          </div>
        </div>

        <button
          onClick={downloadJsonLogs}
          className="px-4 py-2.5 rounded-xl bg-[#050816] border border-[#00E5FF]/30 text-[#00E5FF] hover:bg-[#00E5FF]/15 transition-all text-xs font-bold flex items-center gap-2 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Audit Log (JSON)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0B1020] border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search category, action, status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-[#050816] border border-slate-800 text-xs text-white focus:outline-none focus:border-[#00E5FF]"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#00E5FF] text-[#050816] shadow-[0_0_8px_rgba(0,229,255,0.4)]'
                  : 'bg-[#050816] text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-[#0B1020] border border-[#00E5FF]/20 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#050816] border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                <th className="py-3.5 px-4 font-bold">Time</th>
                <th className="py-3.5 px-4 font-bold">Category</th>
                <th className="py-3.5 px-4 font-bold">Confidence</th>
                <th className="py-3.5 px-4 font-bold">Redaction Action</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-4 font-bold">Element Type</th>
                <th className="py-3.5 px-4 font-bold text-right">Data Security</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                    No privacy events match the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => {
                  const isBlocked = ev.status === 'BLOCKED';
                  return (
                    <tr
                      key={ev.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4 text-slate-400">
                        {ev.timestamp}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF]">
                          {ev.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-200">
                        <div className="flex items-center gap-2">
                          <span>{Math.round(ev.confidence * 100)}%</span>
                          <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#00E5FF] to-[#22C55E]"
                              style={{ width: `${ev.confidence * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            ev.action === 'BLACKOUT'
                              ? 'bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444]'
                              : ev.action === 'BLUR'
                              ? 'bg-[#7C3AED]/15 border border-[#7C3AED]/40 text-[#A78BFA]'
                              : 'bg-[#00E5FF]/15 border border-[#00E5FF]/40 text-[#00E5FF]'
                          }`}
                        >
                          {ev.action}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`flex items-center gap-1.5 text-[11px] font-bold ${
                            isBlocked ? 'text-[#EF4444]' : 'text-[#22C55E]'
                          }`}
                        >
                          {isBlocked ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>{ev.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {ev.element_type || 'dom_element'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-[#050816] px-2 py-0.5 rounded border border-slate-800">
                          <Lock className="w-2.5 h-2.5 text-[#22C55E]" />
                          <span>NEVER TRANSMITTED</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
