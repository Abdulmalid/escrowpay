'use client';

import React, { useState } from 'react';
import { X, Settings, CheckCircle2, AlertCircle, Loader2, KeyRound, Globe, ArrowRight } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [baseUrl, setBaseUrl] = useState('https://api-dev.blaaiz.com');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [signingSecret, setSigningSecret] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/blaaiz/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl,
          clientId: clientId.trim() || undefined,
          clientSecret: clientSecret.trim() || undefined,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ connected: false, error: err.message || 'Connection failed' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel max-w-lg w-full p-6 rounded-2xl border border-slate-800 my-8 shadow-2xl relative text-xs">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-2.5 mb-3 pb-3 border-b border-slate-800">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <KeyRound className="h-5 w-5 stroke-[2]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Blaaiz API & Sandbox Config</h3>
            <p className="text-[11px] text-slate-400">
              Configure credentials for <code className="text-emerald-400">api-dev.blaaiz.com</code>
            </p>
          </div>
        </div>

        <div className="space-y-3.5 my-3">
          <div>
            <label className="block font-medium text-slate-300 mb-1">Blaaiz API Base URL</label>
            <div className="relative">
              <Globe className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Dev: <code className="text-slate-400">https://api-dev.blaaiz.com</code> | Prod: <code className="text-slate-400">https://api-prod.blaaiz.com</code>
            </p>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">OAuth Client ID</label>
            <input
              type="text"
              placeholder="e.g. blz_cli_live_..."
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[10px] text-slate-500 mt-0.5">
              Obtained from <a href="https://business-dev.blaaiz.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">business-dev.blaaiz.com</a>
            </p>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">OAuth Client Secret</label>
            <input
              type="password"
              placeholder="••••••••••••••••••••"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Webhook Signing Secret</label>
            <input
              type="password"
              placeholder="whsec_..."
              value={signingSecret}
              onChange={(e) => setSigningSecret(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[10px] text-slate-500 mt-0.5">
              Used to cryptographically verify <code className="text-emerald-400">x-blaaiz-signature</code>
            </p>
          </div>

          {/* Test Status Feedback */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs ${
                testResult.connected
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : testResult.mode === 'SIMULATION'
                  ? 'bg-blue-950/40 border-blue-500/40 text-blue-300'
                  : 'bg-red-950/40 border-red-500/40 text-red-300'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold mb-1">
                {testResult.connected ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Connected to api-dev.blaaiz.com (Live Dev Token)</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-amber-400" />
                    <span>Sandbox Demo Mode Active</span>
                  </>
                )}
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                {testResult.message ||
                  (testResult.connected
                    ? `Authenticated via Bearer token (${testResult.accessTokenSnippet}). Ready for live virtual accounts and payouts!`
                    : `Error: ${testResult.error || 'Check your client credentials'}`)}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-800">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700 flex items-center space-x-1.5 transition"
          >
            {testing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Testing OAuth Token...</span>
              </>
            ) : (
              <span>Test Connection to api-dev.blaaiz.com</span>
            )}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs transition"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}
