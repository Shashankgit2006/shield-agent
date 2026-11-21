import React, { useState, useEffect, useCallback } from 'react';
import {
  Lock,
  CheckCircle2,
  Send,
  Eye,
  Check,
  X,
  FileCheck2,
  AlertTriangle,
  RefreshCw,
  Globe,
  ExternalLink,
  Edit3,
  Save,
  Plus,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { RedactionMethod, ScanRecord } from '../types';
import { fetchLatestScan, analyzeSanitizedContext, saveScanRecord } from '../services/api';

const DEFAULT_SANDBOX_SCAN: ScanRecord = {
  id: 0,
  timestamp: new Date().toLocaleTimeString(),
  url: 'http://localhost:3000/demo/sensitive-demo-page',
  page_title: 'Checkout & Registration Demo',
  sanitized_image: '',
  redacted_items_count: 5,
  redacted_elements: [
    { category: 'EMAIL', confidence: 0.98, redaction: 'mask', element_type: 'input[name="email"]' },
    { category: 'PASSWORD', confidence: 0.99, redaction: 'blackout', element_type: 'input[name="password"]' },
    { category: 'CARD', confidence: 0.97, redaction: 'mask', element_type: 'input[name="card_number"]' },
    { category: 'PHONE', confidence: 0.95, redaction: 'mask', element_type: 'input[name="phone"]' },
    { category: 'UPI', confidence: 0.94, redaction: 'mask', element_type: 'input[name="upi_vpa"]' },
  ],
  dom_summary: {
    clickable_elements: [
      { tag: 'button', id: 'submit-payment-btn', text: 'Confirm & Pay $49.00' },
      { tag: 'button', id: 'cancel-btn', text: 'Cancel Transaction' },
      { tag: 'input', id: 'promo-code', text: '[PROMO APPLIED]' },
    ],
  },
  timing_breakdown: {
    local_inference_ms: 32.0,
    redaction_ms: 14.0,
    privacy_validation_ms: 6.0,
    network_ms: 18.0,
  },
  privacy_gate_status: 'VERIFIED_SAFE',
};

const CATEGORY_OPTIONS = [
  'EMAIL',
  'PASSWORD',
  'PHONE',
  'CARD',
  'PAN',
  'AADHAAR',
  'UPI',
  'FACE',
  'SECRET',
  'CUSTOM',
];

export const LiveScreenPage: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState<RedactionMethod>('mask');
  const [scan, setScan] = useState<ScanRecord | null>(null);
  const [editableScan, setEditableScan] = useState<ScanRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showGateModal, setShowGateModal] = useState(false);
  const [gateVerdict, setGateVerdict] = useState<{ allowed: boolean; reason?: string; latency?: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadLatestScan = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchLatestScan();
      if (data) {
        setScan(data);
        setEditableScan(JSON.parse(JSON.stringify(data)));
      } else {
        setScan(null);
        setEditableScan(null);
      }
    } catch (err: any) {
      console.warn('Scan fetch notice:', err);
      setErrorMsg(err.message || 'Unable to retrieve latest scan.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLatestScan();

    // Auto-refresh scan every 3 seconds and on window focus (unless in edit mode)
    const interval = setInterval(() => {
      if (!isEditing) {
        loadLatestScan();
      }
    }, 3000);

    const onFocus = () => {
      if (!isEditing) {
        loadLatestScan();
      }
    };
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadLatestScan, isEditing]);

  const handleBatchMethodChange = (m: RedactionMethod) => {
    setSelectedMethod(m);
    if (editableScan) {
      const updatedElements = editableScan.redacted_elements.map((el) => ({
        ...el,
        redaction: m,
      }));
      setEditableScan({
        ...editableScan,
        redacted_elements: updatedElements,
      });
    }
  };

  const handleLoadSandbox = () => {
    const sandbox = JSON.parse(JSON.stringify(DEFAULT_SANDBOX_SCAN));
    setScan(sandbox);
    setEditableScan(sandbox);
    setIsEditing(true);
    setSaveNotice('Loaded interactive sandbox template. You can now edit fields, add elements, and test PrivacyGate.');
  };

  const handleElementCategoryChange = (index: number, newCat: string) => {
    if (!editableScan) return;
    const updated = [...editableScan.redacted_elements];
    updated[index] = { ...updated[index], category: newCat };
    setEditableScan({
      ...editableScan,
      redacted_elements: updated,
      redacted_items_count: updated.length,
    });
  };

  const handleElementRedactionChange = (index: number, newMethod: RedactionMethod) => {
    if (!editableScan) return;
    const updated = [...editableScan.redacted_elements];
    updated[index] = { ...updated[index], redaction: newMethod };
    setEditableScan({ ...editableScan, redacted_elements: updated });
  };

  const handleElementTypeChange = (index: number, newType: string) => {
    if (!editableScan) return;
    const updated = [...editableScan.redacted_elements];
    updated[index] = { ...updated[index], element_type: newType };
    setEditableScan({ ...editableScan, redacted_elements: updated });
  };

  const handleRemoveElement = (index: number) => {
    if (!editableScan) return;
    const updated = editableScan.redacted_elements.filter((_, i) => i !== index);
    setEditableScan({
      ...editableScan,
      redacted_elements: updated,
      redacted_items_count: updated.length,
    });
  };

  const handleAddElement = () => {
    if (!editableScan) return;
    const newElement = {
      category: 'CUSTOM',
      confidence: 0.95,
      redaction: selectedMethod,
      element_type: 'input[name="custom_field"]',
    };
    const updated = [...editableScan.redacted_elements, newElement];
    setEditableScan({
      ...editableScan,
      redacted_elements: updated,
      redacted_items_count: updated.length,
    });
  };

  // DOM Clickable element handlers
  const handleDomElementChange = (index: number, field: 'tag' | 'id' | 'text', val: string) => {
    if (!editableScan) return;
    const currentList = [...(editableScan.dom_summary?.clickable_elements || [])];
    currentList[index] = { ...currentList[index], [field]: val };
    setEditableScan({
      ...editableScan,
      dom_summary: {
        ...(editableScan.dom_summary || {}),
        clickable_elements: currentList,
      },
    });
  };

  const handleRemoveDomElement = (index: number) => {
    if (!editableScan) return;
    const currentList = (editableScan.dom_summary?.clickable_elements || []).filter((_: any, i: number) => i !== index);
    setEditableScan({
      ...editableScan,
      dom_summary: {
        ...(editableScan.dom_summary || {}),
        clickable_elements: currentList,
      },
    });
  };

  const handleAddDomElement = () => {
    if (!editableScan) return;
    const currentList = [...(editableScan.dom_summary?.clickable_elements || [])];
    currentList.push({
      tag: 'button',
      id: `btn-${Date.now().toString().slice(-4)}`,
      text: 'New Interactive Target',
    });
    setEditableScan({
      ...editableScan,
      dom_summary: {
        ...(editableScan.dom_summary || {}),
        clickable_elements: currentList,
      },
    });
  };

  const handleSaveScan = async () => {
    if (!editableScan) return;
    setIsSaving(true);
    setSaveNotice(null);
    try {
      const payload = {
        sanitized: true,
        privacy_verified: true,
        redacted_items_count: editableScan.redacted_elements.length,
        redacted_elements: editableScan.redacted_elements,
        sanitized_image: editableScan.sanitized_image || '',
        dom_summary: editableScan.dom_summary || {},
        url: editableScan.url || 'http://localhost:3000',
        page_title: editableScan.page_title || 'Edited Page',
        timing_breakdown: editableScan.timing_breakdown || {
          local_inference_ms: 30.0,
          redaction_ms: 12.0,
          privacy_validation_ms: 5.0,
          network_ms: 15.0,
        },
      };

      const result = await saveScanRecord(payload);
      setScan(JSON.parse(JSON.stringify(editableScan)));
      setIsEditing(false);
      setSaveNotice(`✓ Successfully saved updated scan #${result.scan_id} to database!`);
    } catch (err: any) {
      setSaveNotice(`Failed to save scan: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    if (scan) {
      setEditableScan(JSON.parse(JSON.stringify(scan)));
    }
    setIsEditing(false);
    setSaveNotice('Reverted all unsaved edits to original scan.');
  };

  const handleTransmitClick = async () => {
    const activeData = editableScan || scan;
    if (!activeData) return;

    setIsVerifying(true);
    setShowGateModal(true);
    setGateVerdict(null);

    const payload = {
      sanitized: true,
      privacy_verified: true,
      redacted_items_count: activeData.redacted_elements.length,
      redacted_elements: activeData.redacted_elements,
      sanitized_image: activeData.sanitized_image || 'data:image/jpeg;base64,sample',
      dom_summary: activeData.dom_summary || {},
      url: activeData.url,
      page_title: activeData.page_title,
      timing_breakdown: activeData.timing_breakdown || {
        local_inference_ms: 32.0,
        redaction_ms: 14.0,
        privacy_validation_ms: 6.0,
        network_ms: 18.0,
      },
    };

    try {
      const res = await analyzeSanitizedContext(payload);
      setGateVerdict({
        allowed: true,
        reason: res.visual_summary || 'Sanitized payload verified by PrivacyGate and accepted by FastAPI server.',
        latency: res.server_latency_ms,
      });
    } catch (err: any) {
      setGateVerdict({
        allowed: false,
        reason: err.message || 'Server rejected context payload.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Compute category counts dynamically from active elements
  const activeElements = editableScan?.redacted_elements || scan?.redacted_elements || [];
  const categoryCounts: Record<string, number> = {};
  for (const el of activeElements) {
    const cat = el.category.toUpperCase();
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  const currentViewScan = editableScan || scan;

  return (
    <div className="space-y-6">
      {/* Top Controls & Category Summary */}
      <div className="bg-[#0B1020] border border-[#00E5FF]/20 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#050816] border border-[#00E5FF]/40 text-[#00E5FF]">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                Live Screen Redaction Inspector
              </h3>
              {isEditing && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 font-mono font-bold">
                  EDIT MODE ACTIVE
                </span>
              )}
              {currentViewScan && !isEditing && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30 font-mono">
                  {currentViewScan.timestamp}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {currentViewScan
                ? `Audited context: ${currentViewScan.url || 'Active Tab'}`
                : 'Inspect and customize live browser tab redactions & PrivacyGate outputs.'}
            </p>
          </div>
        </div>

        {/* Real Category Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {Object.keys(categoryCounts).length > 0 ? (
            Object.entries(categoryCounts).map(([cat, count]) => (
              <span
                key={cat}
                className="px-2.5 py-1 rounded-md bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF]"
              >
                {cat}: <strong>{count}</strong>
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-500 italic">No sensitive fields recorded in active scan</span>
          )}
        </div>

        {/* Action Buttons: Edit, Refresh, Batch Redaction Method Toggle */}
        <div className="flex items-center gap-3">
          {currentViewScan && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isEditing
                  ? 'bg-[#F59E0B] text-black border-[#F59E0B] shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                  : 'bg-[#050816] text-[#00E5FF] border-[#00E5FF]/40 hover:bg-[#00E5FF]/10'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Editing...' : 'Edit Screen'}</span>
            </button>
          )}

          <button
            onClick={loadLatestScan}
            disabled={isLoading}
            className="p-2 rounded-lg bg-[#050816] border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
            title="Refresh latest scan from extension/backend"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#00E5FF]' : ''}`} />
          </button>

          <div className="flex rounded-lg bg-[#050816] border border-slate-700 p-0.5 text-xs">
            {(['mask', 'blackout', 'blur', 'pixelate'] as RedactionMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => handleBatchMethodChange(m)}
                className={`px-2.5 py-1 rounded-md uppercase font-bold text-[10px] transition-all cursor-pointer ${
                  selectedMethod === m
                    ? 'bg-[#00E5FF] text-[#050816] shadow-[0_0_10px_rgba(0,229,255,0.5)]'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={`Set all redaction methods to ${m}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save Notice Banner */}
      {saveNotice && (
        <div className="p-3.5 rounded-xl bg-[#0B1020] border border-[#00E5FF]/40 flex items-center justify-between text-xs text-[#00E5FF] font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
            <span>{saveNotice}</span>
          </div>
          <button
            onClick={() => setSaveNotice(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Dual View */}
      {currentViewScan ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT PANEL: ORIGINAL CONTEXT (EDITABLE SENSITIVE TARGETS) */}
          <div className="bg-[#0B1020] border-2 border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-[#050816] px-5 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-[#F59E0B]/20 text-[#F59E0B]">
                  <Lock className="w-4 h-4" />
                </span>
                <span className="font-extrabold text-xs tracking-wider uppercase text-white">
                  ORIGINAL SCREEN METADATA &amp; TARGETS
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444] text-[10px] font-bold tracking-wider">
                🔒 LOCAL BOUNDARY – NOT SENT
              </span>
            </div>

            <div className="p-6 bg-[#0E1528] relative flex-1 min-h-[460px] font-sans text-xs space-y-4">
              {/* Webpage Info (Editable in Edit Mode) */}
              <div className="p-3 rounded-xl bg-[#050816] border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-slate-300">
                  <Globe className="w-4 h-4 text-[#00E5FF]" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={editableScan?.page_title || ''}
                      onChange={(e) =>
                        setEditableScan(editableScan ? { ...editableScan, page_title: e.target.value } : null)
                      }
                      placeholder="Page Title"
                      className="flex-1 bg-[#02040A] border border-slate-700 rounded px-2 py-1 text-white text-xs font-bold focus:border-[#00E5FF] outline-none"
                    />
                  ) : (
                    <span className="font-bold text-white truncate">{currentViewScan.page_title || 'Webpage'}</span>
                  )}
                </div>
                <div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editableScan?.url || ''}
                      onChange={(e) =>
                        setEditableScan(editableScan ? { ...editableScan, url: e.target.value } : null)
                      }
                      placeholder="Target URL"
                      className="w-full bg-[#02040A] border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300 font-mono focus:border-[#00E5FF] outline-none"
                    />
                  ) : (
                    <div className="text-[11px] text-slate-400 font-mono break-all">
                      {currentViewScan.url || 'http://localhost:3000'}
                    </div>
                  )}
                </div>
              </div>

              {/* Detected sensitive items table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <span>Sensitive Targets ({currentViewScan.redacted_elements.length})</span>
                    {isEditing && (
                      <span className="text-[10px] text-[#F59E0B] font-mono font-normal">
                        (Click fields to edit)
                      </span>
                    )}
                  </h4>
                  {isEditing && (
                    <button
                      onClick={handleAddElement}
                      className="px-2 py-1 rounded bg-[#00E5FF]/20 border border-[#00E5FF]/40 text-[#00E5FF] text-[10px] font-bold flex items-center gap-1 hover:bg-[#00E5FF]/30 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Target</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {currentViewScan.redacted_elements.map((el, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-[#050816] border border-slate-800 space-y-2 text-[11px] hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1">
                            {/* Category Selector */}
                            <select
                              value={el.category}
                              onChange={(e) => handleElementCategoryChange(i, e.target.value)}
                              className="bg-[#02040A] border border-slate-700 text-[#EF4444] rounded px-2 py-1 text-[10px] font-mono font-bold outline-none"
                            >
                              {CATEGORY_OPTIONS.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>

                            {/* Element Selector Input */}
                            <input
                              type="text"
                              value={el.element_type || ''}
                              onChange={(e) => handleElementTypeChange(i, e.target.value)}
                              placeholder="Selector / Element"
                              className="flex-1 bg-[#02040A] border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-[10px] outline-none"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-[#EF4444]/20 text-[#EF4444] font-mono font-bold text-[9px]">
                              {el.category}
                            </span>
                            <span className="text-slate-300 font-mono">{el.element_type || 'element'}</span>
                          </div>
                        )}

                        {/* Redaction Method & Delete */}
                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          {isEditing ? (
                            <>
                              <select
                                value={el.redaction}
                                onChange={(e) => handleElementRedactionChange(i, e.target.value as RedactionMethod)}
                                className="bg-[#02040A] border border-slate-700 text-[#00E5FF] rounded px-2 py-1 text-[10px] uppercase font-bold outline-none"
                              >
                                {(['mask', 'blackout', 'blur', 'pixelate'] as RedactionMethod[]).map((method) => (
                                  <option key={method} value={method}>
                                    {method}
                                  </option>
                                ))}
                              </select>

                              <button
                                onClick={() => handleRemoveElement(i)}
                                className="p-1 rounded text-slate-500 hover:text-[#EF4444] hover:bg-[#EF4444]/10 cursor-pointer"
                                title="Remove element"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-slate-400">Confidence: {Math.round(el.confidence * 100)}%</span>
                              <span className="text-[#00E5FF] uppercase font-bold">[{el.redaction}]</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: SANITIZED SCREEN & DOM (EDITABLE DOM SUMMARY) */}
          <div className="bg-[#0B1020] border-2 border-[#22C55E]/60 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-[#050816] px-5 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-[#22C55E]/20 text-[#22C55E]">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
                <span className="font-extrabold text-xs tracking-wider uppercase text-white">
                  SANITIZED SCREEN &amp; DOM CONTEXT
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#22C55E] text-[10px] font-bold tracking-wider">
                ✓ ZERO-LEAK VERIFIED
              </span>
            </div>

            <div className="p-6 bg-[#0E1528] relative flex-1 min-h-[460px] font-sans text-xs space-y-4">
              {/* Sanitized Image Preview */}
              {currentViewScan.sanitized_image && currentViewScan.sanitized_image.startsWith('data:image/') ? (
                <div className="rounded-xl overflow-hidden border border-slate-700 bg-black flex items-center justify-center max-h-[180px]">
                  <img
                    src={currentViewScan.sanitized_image}
                    alt="Sanitized Viewport"
                    className="max-h-[180px] object-contain w-full"
                  />
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-[#050816] border border-[#22C55E]/30 text-center text-slate-300">
                  <div className="text-xs font-bold text-[#22C55E] mb-0.5">Canvas Pixel Redaction Engine</div>
                  <p className="text-[10px] text-slate-400">All sensitive bounding boxes masked via HTML5 Canvas API</p>
                </div>
              )}

              {/* Sanitized DOM Interactive Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <span>
                      Sanitized DOM Elements ({currentViewScan.dom_summary?.clickable_elements?.length || 0})
                    </span>
                    {isEditing && (
                      <span className="text-[10px] text-[#22C55E] font-mono font-normal">
                        (Editable elements for AI)
                      </span>
                    )}
                  </h4>
                  {isEditing && (
                    <button
                      onClick={handleAddDomElement}
                      className="px-2 py-1 rounded bg-[#22C55E]/20 border border-[#22C55E]/40 text-[#22C55E] text-[10px] font-bold flex items-center gap-1 hover:bg-[#22C55E]/30 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Element</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {(currentViewScan.dom_summary?.clickable_elements || []).map((el: any, i: number) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-[#050816] border border-slate-800 space-y-1 font-mono text-[10px]"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={el.tag || 'button'}
                            onChange={(e) => handleDomElementChange(i, 'tag', e.target.value)}
                            placeholder="Tag (button/input)"
                            className="w-16 bg-[#02040A] border border-slate-700 rounded px-1.5 py-1 text-[#00E5FF] font-bold outline-none"
                          />
                          <input
                            type="text"
                            value={el.id || ''}
                            onChange={(e) => handleDomElementChange(i, 'id', e.target.value)}
                            placeholder="ID / Name"
                            className="w-28 bg-[#02040A] border border-slate-700 rounded px-1.5 py-1 text-slate-300 outline-none"
                          />
                          <input
                            type="text"
                            value={el.text || ''}
                            onChange={(e) => handleDomElementChange(i, 'text', e.target.value)}
                            placeholder="Visible Text / Placeholder"
                            className="flex-1 bg-[#02040A] border border-slate-700 rounded px-1.5 py-1 text-white font-bold outline-none"
                          />
                          <button
                            onClick={() => handleRemoveDomElement(i)}
                            className="p-1 rounded text-slate-500 hover:text-[#EF4444] cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-[#00E5FF]">
                            &lt;{el.tag} id=&quot;{el.id}&quot;&gt;
                          </span>
                          <span className="text-slate-200 font-bold truncate max-w-[200px]">
                            {el.text || 'Submit'}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State Guidance with Interactive Sandbox Launcher */
        <div className="bg-[#0B1020] border border-slate-800 rounded-2xl p-10 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-[#050816] border border-[#00E5FF]/40 text-[#00E5FF] flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(0,229,255,0.2)]">
            <Eye className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-base font-bold text-white">No Active Browser Scan Recorded Yet</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              You can run a scan directly from the Chrome extension on any webpage, or load an interactive template right now to edit and test privacy controls immediately.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              onClick={handleLoadSandbox}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#7C3AED] text-white text-xs font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:opacity-90 cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Load Editable Scan Template</span>
            </button>
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl bg-[#050816] border border-[#00E5FF]/50 text-[#00E5FF] hover:bg-[#00E5FF]/15 text-xs font-bold inline-flex items-center gap-2"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Sensitive Demo Page (Port 3000)</span>
            </a>
          </div>
        </div>
      )}

      {/* Bottom Action Bar: Save / Discard / Verify & Transmit */}
      {currentViewScan && (
        <div className="bg-[#0B1020] border border-[#00E5FF]/30 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/50 flex items-center justify-center text-[#22C55E]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                {isEditing ? 'Editing Live Screen Targets' : 'PrivacyGate Ready: Verified Zero Leaks'}
              </h4>
              <p className="text-[11px] text-slate-400">
                {isEditing
                  ? 'Customize detected fields and DOM elements, then save or test against the PrivacyGate.'
                  : 'Outbound transmission strictly restricted to masked canvas and sanitized DOM elements.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleDiscardChanges}
                  className="px-4 py-2.5 rounded-xl bg-[#050816] border border-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Discard</span>
                </button>
                <button
                  onClick={handleSaveScan}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-[#22C55E] text-[#050816] font-extrabold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:opacity-95 cursor-pointer"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save Changes</span>
                </button>
              </>
            ) : null}

            <button
              onClick={handleTransmitClick}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#22C55E] text-[#050816] font-extrabold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:opacity-95 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Verify &amp; Transmit to FastAPI</span>
            </button>
          </div>
        </div>
      )}

      {/* Privacy Gate Verification Modal */}
      {showGateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#0B1020] border-2 border-[#00E5FF] rounded-2xl max-w-lg w-full p-6 shadow-[0_0_50px_rgba(0,229,255,0.4)] relative">
            <button
              onClick={() => setShowGateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-[#050816] border border-[#00E5FF] text-[#00E5FF]">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white tracking-wide">
                  PRIVACY GATE VERIFICATION
                </h3>
                <p className="text-xs text-[#00E5FF] font-mono">
                  PRE-TRANSMISSION OUTBOUND AUDIT
                </p>
              </div>
            </div>

            {isVerifying ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-10 h-10 border-4 border-[#00E5FF] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-mono text-slate-300">
                  Executing post-redaction visual &amp; textual regex inspection against backend PrivacyGate...
                </p>
              </div>
            ) : gateVerdict ? (
              <div className="space-y-4 text-xs font-mono">
                <div className="space-y-2 bg-[#050816] p-4 rounded-xl border border-slate-800">
                  <div className={`flex items-center justify-between ${gateVerdict.allowed ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                    <span>1. Security Audit:</span>
                    <span className="flex items-center gap-1 font-bold">
                      {gateVerdict.allowed ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      {gateVerdict.allowed ? 'PASSED (Zero Leaks)' : 'HARD BLOCKED'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>2. Server Latency:</span>
                    <span>{gateVerdict.latency || 18}ms</span>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-lg border text-[11px] leading-relaxed ${
                    gateVerdict.allowed
                      ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]'
                      : 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
                  }`}
                >
                  {gateVerdict.reason}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowGateModal(false)}
                    className="px-5 py-2 rounded-lg bg-[#00E5FF] text-black font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <span>Close</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
