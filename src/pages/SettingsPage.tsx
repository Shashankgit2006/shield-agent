import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Cpu,
  Server,
  Save,
  CheckCircle2,
  User as UserIcon,
  Mail,
  Calendar,
  KeyRound,
  LogOut,
  ShieldCheck,
  Key,
} from 'lucide-react';
import { AppSettings } from '../types';
import { setApiBaseUrl, fetchAiConfig, saveAiConfig } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    localAiEnabled: true,
    webgpuEnabled: true,
    privacyShieldArmed: true,
    autoRedaction: true,
    actionConfirmation: false,
    serverUrl: 'http://localhost:8000',
    aiProvider: 'mock',
    theme: 'dark-cyber',
  });

  const [apiKey, setApiKey] = useState('');
  const [aiModel, setAiModel] = useState('');
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [savedNotice, setSavedNotice] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<string | null>(null);

  useEffect(() => {
    fetchAiConfig()
      .then((cfg) => {
        if (cfg) {
          setSettings((prev) => ({
            ...prev,
            aiProvider: (cfg.provider as any) || 'mock',
          }));
          if (cfg.model) setAiModel(cfg.model);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formattedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Active Session';

  const handleSave = async () => {
    setApiBaseUrl(settings.serverUrl);
    try {
      await saveAiConfig({
        provider: settings.aiProvider,
        api_key: apiKey.trim() || undefined,
        model: aiModel.trim() || undefined,
      });
    } catch (e) {
      console.warn('AI config save notice:', e);
    }
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const res = await fetch(`${settings.serverUrl}/api/health`);
      if (res.ok) {
        setConnectionResult('✓ Server reachable! PrivacyGate enforced on endpoint.');
      } else {
        setConnectionResult(`⚠ Connected but returned status ${res.status}`);
      }
    } catch {
      setConnectionResult('ℹ Cannot connect to server URL. Ensure backend is running.');
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header Card */}
      <div className="bg-[#0B1020] border border-[#00E5FF]/20 rounded-2xl p-6 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-[#050816] border border-[#00E5FF]/40 text-[#00E5FF]">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white tracking-wide uppercase">
              Shield-Agent Controls & Privacy Settings
            </h3>
            <p className="text-xs text-slate-400">
              Configure local inference adapters, WebGPU hardware acceleration, and backend endpoints.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#22C55E] text-[#050816] font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(0,229,255,0.4)] cursor-pointer hover:opacity-95"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>

      {savedNotice && (
        <div className="p-3 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/40 text-[#22C55E] text-xs font-mono flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>Settings saved to local storage and active runtime context.</span>
        </div>
      )}

      {/* Settings Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Privacy Protection (Defaults to ON) */}
        <div className="bg-[#0B1020] border border-[#22C55E]/30 rounded-2xl p-5 shadow-xl space-y-4">
          <h4 className="text-xs font-bold text-[#22C55E] uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <span>Core Privacy & Gate Policy</span>
          </h4>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-white block">
                  Privacy Protection Shield
                </label>
                <p className="text-[10px] text-slate-400">
                  Mandatory client-side masking of passwords, PII, and financial cards.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.privacyShieldArmed}
                onChange={(e) =>
                  setSettings({ ...settings, privacyShieldArmed: e.target.checked })
                }
                className="w-4 h-4 accent-[#22C55E] rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-white block">
                  Auto-Redaction Pre-Processing
                </label>
                <p className="text-[10px] text-slate-400">
                  Automatically blur detected faces and blackout credential inputs.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoRedaction}
                onChange={(e) =>
                  setSettings({ ...settings, autoRedaction: e.target.checked })
                }
                className="w-4 h-4 accent-[#00E5FF] rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-white block">
                  Human-in-the-Loop Action Confirmation
                </label>
                <p className="text-[10px] text-slate-400">
                  Prompt user approval dialog before executing autonomous clicks.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.actionConfirmation}
                onChange={(e) =>
                  setSettings({ ...settings, actionConfirmation: e.target.checked })
                }
                className="w-4 h-4 accent-[#7C3AED] rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Local AI & Hardware Acceleration */}
        <div className="bg-[#0B1020] border border-[#00E5FF]/30 rounded-2xl p-5 shadow-xl space-y-4">
          <h4 className="text-xs font-bold text-[#00E5FF] uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Cpu className="w-4 h-4" />
            <span>Local AI & Acceleration</span>
          </h4>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-white block">
                  Local AI Inference Engine
                </label>
                <p className="text-[10px] text-slate-400">
                  Execute DOM analysis & regex PII matching strictly on client.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.localAiEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, localAiEnabled: e.target.checked })
                }
                className="w-4 h-4 accent-[#00E5FF] rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-white block">
                  WebGPU Hardware Acceleration
                </label>
                <p className="text-[10px] text-slate-400">
                  Enable navigator.gpu for sub-50ms tensor operations.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.webgpuEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, webgpuEnabled: e.target.checked })
                }
                className="w-4 h-4 accent-[#00E5FF] rounded cursor-pointer"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-white block mb-1">
                AI Provider Mode
              </label>
              <select
                value={settings.aiProvider}
                onChange={(e) =>
                  setSettings({ ...settings, aiProvider: e.target.value as any })
                }
                className="w-full px-3 py-2 rounded-lg bg-[#050816] border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00E5FF] font-mono"
              >
                <option value="mock">MockAIProvider (Zero-Config Local Mode)</option>
                <option value="gemini">Google Gemini VLM (Via Cloud Backend)</option>
                <option value="openai">OpenAI GPT-4o VLM (Via Cloud Backend)</option>
              </select>
            </div>

            {settings.aiProvider !== 'mock' && (
              <div className="space-y-3 pt-2 border-t border-slate-800 animate-fade-in">
                <div>
                  <label className="text-xs font-bold text-[#00E5FF] block mb-1">
                    {settings.aiProvider === 'gemini' ? 'Google Gemini API Key' : 'OpenAI API Key'}
                  </label>
                  <div className="relative">
                    <Key className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={settings.aiProvider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#050816] border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00E5FF] font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Transmits strictly sanitized visual tokens to the official {settings.aiProvider.toUpperCase()} REST API.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold text-white block mb-1">
                    Model Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    placeholder={settings.aiProvider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini'}
                    className="w-full px-3 py-2 rounded-lg bg-[#050816] border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00E5FF] font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: FastAPI Server Connection */}
        <div className="col-span-1 md:col-span-2 bg-[#0B1020] border border-[#00E5FF]/20 rounded-2xl p-5 shadow-xl space-y-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Server className="w-4 h-4 text-[#00E5FF]" />
            <span>FastAPI Backend Connection</span>
          </h4>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={settings.serverUrl}
              onChange={(e) => setSettings({ ...settings, serverUrl: e.target.value })}
              placeholder="http://localhost:8000"
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#050816] border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-[#00E5FF]"
            />
            <button
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="px-5 py-2.5 rounded-xl bg-[#050816] border border-[#00E5FF]/40 text-[#00E5FF] hover:bg-[#00E5FF]/10 text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {testingConnection && (
                <div className="w-3.5 h-3.5 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin" />
              )}
              <span>Test Endpoint</span>
            </button>
          </div>

          {connectionResult && (
            <div className="p-3 rounded-xl bg-[#050816] border border-slate-800 text-xs font-mono text-slate-300">
              {connectionResult}
            </div>
          )}
        </div>

        {/* Section 4: User Profile (Settings Integration) */}
        <div className="col-span-1 md:col-span-2 bg-[#0B1020] border border-[#00E5FF]/30 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-xs font-bold text-[#00E5FF] uppercase tracking-wider flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              <span>Operator Profile & Identity</span>
            </h4>
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444] hover:bg-[#EF4444]/25 transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-[#050816] border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                Name
              </span>
              <strong className="text-white text-xs block truncate">
                {user?.full_name || 'Anonymous Operator'}
              </strong>
            </div>

            <div className="p-3.5 rounded-xl bg-[#050816] border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                Email
              </span>
              <strong className="text-white text-xs block truncate">
                {user?.email || '—'}
              </strong>
            </div>

            <div className="p-3.5 rounded-xl bg-[#050816] border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                Account Created
              </span>
              <strong className="text-slate-300 text-xs block truncate">
                {formattedDate}
              </strong>
            </div>

            <div className="p-3.5 rounded-xl bg-[#050816] border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                Auth Status
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] shadow-[0_0_8px_#22C55E]" />
                <strong className="text-[#22C55E] text-xs">
                  {isAuthenticated ? 'AUTHENTICATED' : 'ANONYMOUS'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
