'use client';

import React from 'react';
import { X, Cpu, CheckCircle2, ShieldCheck, ArrowRight, Zap, Layers, Lock } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ArchitectureModal({ isOpen, onClose }: ArchitectureModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel max-w-3xl w-full p-6 sm:p-8 rounded-2xl border border-slate-800 my-8 shadow-2xl relative text-xs text-slate-300">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-2.5 mb-4 pb-4 border-b border-slate-800">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Cpu className="h-6 w-6 stroke-[2]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">EscrowPay + Blaaiz Platform Architecture</h3>
            <p className="text-[11px] text-slate-400">
              End-to-End Architectural Flow of Remittance-as-a-Service (RaaS) & BaaS Integration
            </p>
          </div>
        </div>

        {/* The 4-Step Architecture Flow */}
        <div className="space-y-4 my-4">
          {/* Step 1 */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-[10px]">
                  1
                </span>
                <span className="font-bold text-white text-xs">
                  OAuth2 Scoped Auth & Dedicated Virtual Account Provisioning
                </span>
              </div>
              <span className="font-mono text-[10px] text-emerald-400">
                POST /oauth/token & POST /api/external/virtual-account
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Upon contract creation, EscrowPay requests a short-lived Bearer token using client credentials with least-privilege scopes (<code className="text-emerald-400 font-mono">virtual_account:create</code>, <code className="text-emerald-400 font-mono">payout:create</code>). Blaaiz provisions a localized BaaS account: US ACH/Wire (Community Federal), EU SEPA IBAN (Banking Circle), or UK Sort Code (ClearBank) tagged with a unique <code className="text-slate-200 font-mono">merchant_reference</code>.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-[10px]">
                  2
                </span>
                <span className="font-bold text-white text-xs">
                  Cryptographic Inbound Webhook (<code className="font-mono text-emerald-300">x-blaaiz-signature</code>)
                </span>
              </div>
              <span className="font-mono text-[10px] text-teal-400">
                POST /api/webhooks/blaaiz (collection_url)
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              When the client deposits fiat via local banking rails, Blaaiz hits our <code className="text-slate-200 font-mono">collection_url</code>. The payload is cryptographically validated using HMAC-SHA256 signature against the merchant's <code className="text-slate-200 font-mono">signing_secret</code>, preventing replay attacks and forging.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-[10px]">
                  3
                </span>
                <span className="font-bold text-white text-xs">
                  FX Devaluation Shield & Stablecoin Auto-Hedge
                </span>
              </div>
              <span className="font-mono text-[10px] text-amber-400">
                POST /api/external/swap (USDC Polygon Rail)
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Emerging market currencies (like NGN or KES) fluctuate unpredictably. To protect contractor earnings during delivery, EscrowPay automatically swaps the deposited balance into <strong className="text-white">USDC stablecoin</strong>. If the local currency devalues 5-10% during project execution, the contractor loses nothing.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-[10px]">
                  4
                </span>
                <span className="font-bold text-white text-xs">
                  Milestone Release & Multi-Rail Instant Payout
                </span>
              </div>
              <span className="font-mono text-[10px] text-purple-400">
                POST /api/external/payout
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Upon client approval of work, EscrowPay dispatches an instantaneous payout through Blaaiz's settlement layer to Nigeria Instant Payment (NIP), Safaricom M-Pesa, or direct on-chain crypto wallets in <strong>under 15 seconds</strong> with an idempotent <code className="text-slate-200 font-mono">merchant_reference</code>.
            </p>
          </div>
        </div>

        {/* Security & Compliance Callout */}
        <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 flex items-center space-x-3">
          <Lock className="h-5 w-5 text-emerald-400 shrink-0" />
          <div className="text-[11px] text-slate-400">
            <strong className="text-white">Compliance & Signa KYC Ready:</strong> Architected to hook directly into Blaaiz Signa KYC/KYB document pre-signed upload URLs (<code className="text-emerald-400">POST /files</code>) for institutional onboarding.
          </div>
        </div>

        <div className="flex justify-end pt-4 mt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
