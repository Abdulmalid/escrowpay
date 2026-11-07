'use client';

import React, { useState } from 'react';
import { X, Play, ShieldAlert, Sparkles, Code2, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { Contract } from '@/lib/types';
import confetti from 'canvas-confetti';

interface SimulatorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contracts: Contract[];
  onRefresh: () => void;
}

export default function SimulatorDrawer({
  isOpen,
  onClose,
  contracts,
  onRefresh,
}: SimulatorDrawerProps) {
  const [selectedContractId, setSelectedContractId] = useState<string>(contracts[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  if (!isOpen) return null;

  const currentContract = contracts.find((c) => c.id === selectedContractId) || contracts[0];

  const handleSimulateDeposit = async () => {
    if (!currentContract) return;
    setLoading(true);
    try {
      const res = await fetch('/api/simulate/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: currentContract.id,
          amount: currentContract.totalAmount,
        }),
      });

      const data = await res.json();
      setLastResult(data);
      onRefresh();

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      alert(err.message || 'Simulation error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Judge Interactive Simulator</h3>
              <p className="text-[11px] text-slate-400">Test Blaaiz webhooks & dual-rail settlement live</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contract Selector */}
        <div className="my-4">
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Select Active Escrow Contract to Simulate:
          </label>
          <select
            value={currentContract?.id}
            onChange={(e) => setSelectedContractId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
          >
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.currency} {c.totalAmount}) — [{c.status}]
              </option>
            ))}
          </select>
        </div>

        {/* Simulation Actions */}
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-200">1. Simulate Inbound Bank Wire / ACH</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-mono">
                collection.successful
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
              Dispatches an authentic signed webhook containing the dedicated Blaaiz Virtual Account
              number and HMAC-SHA256 signature in the <code className="text-emerald-400">x-blaaiz-signature</code> header.
            </p>
            <button
              onClick={handleSimulateDeposit}
              disabled={loading || !currentContract}
              className="w-full py-2.5 px-4 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 rounded-lg shadow-lg shadow-emerald-500/20 transition flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Computing Signature & Delivering Webhook...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Deposit {currentContract?.currency} {currentContract?.totalAmount} to Virtual Account</span>
                </>
              )}
            </button>
          </div>

          {/* Inspect Output */}
          {lastResult && (
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-xs">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold mb-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Cryptographic Webhook Verified & Processed</span>
              </div>

              <div className="space-y-2 font-mono text-[11px]">
                <div>
                  <div className="text-slate-400 text-[10px]">x-blaaiz-signature (HMAC-SHA256):</div>
                  <div className="p-1.5 bg-slate-950 rounded text-emerald-300 break-all border border-slate-800">
                    {lastResult.signature}
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 text-[10px]">Dispatched Payload:</div>
                  <pre className="p-2 bg-slate-950 rounded text-slate-300 overflow-x-auto max-h-40 border border-slate-800 text-[10px]">
                    {JSON.stringify(lastResult.payload, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <Code2 className="h-4 w-4 text-emerald-400" />
          <span>Endpoint: /api/webhooks/blaaiz</span>
        </div>
        <span className="text-emerald-400 font-medium">Ready for Judge Review</span>
      </div>
    </div>
  );
}
