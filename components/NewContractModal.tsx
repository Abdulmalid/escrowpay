'use client';

import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import { Currency, PayoutCurrency } from '@/lib/types';

interface NewContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (contractId?: string) => void;
  defaultClientName?: string;
  defaultClientEmail?: string;
}

export default function NewContractModal({ isOpen, onClose, onCreated, defaultClientName = '', defaultClientEmail = '' }: NewContractModalProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [freelancerName, setFreelancerName] = useState('');
  const [freelancerEmail, setFreelancerEmail] = useState('');
  const [freelancerCountry, setFreelancerCountry] = useState('Nigeria');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [targetPayoutCurrency, setTargetPayoutCurrency] = useState<PayoutCurrency>('NGN');
  const [payoutMethod, setPayoutMethod] = useState<'bank_transfer' | 'mobile_money' | 'crypto_stablecoin'>('bank_transfer');
  
  // Payout details
  const [bankName, setBankName] = useState('Zenith Bank PLC');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankCode, setBankCode] = useState('057');
  const [mobileNumber, setMobileNumber] = useState('');
  const [networkProvider, setNetworkProvider] = useState('Safaricom M-Pesa');
  const [cryptoAddress, setCryptoAddress] = useState('');

  const [totalAmount, setTotalAmount] = useState(1500);
  const [autoHedge, setAutoHedge] = useState(true);

  // Milestones
  const [milestones, setMilestones] = useState([
    { title: 'Milestone 1: Prototype & DB Schema', amount: 600, description: 'Core API setup and schema specs' },
    { title: 'Milestone 2: Final Frontend & Production Deployment', amount: 900, description: 'Complete QA and delivery' },
  ]);

  // Prefill from the signed-in client whenever the form opens.
  useEffect(() => {
    if (isOpen) {
      setClientName(defaultClientName);
      setClientEmail(defaultClientEmail);
    }
  }, [isOpen, defaultClientName, defaultClientEmail]);

  // The project total is always the sum of its milestones.
  useEffect(() => {
    setTotalAmount(milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0));
  }, [milestones]);

  if (!isOpen) return null;

  const handleAddMilestone = () => {
    setMilestones([...milestones, { title: `Milestone ${milestones.length + 1}`, amount: 300, description: '' }]);
  };

  const handleRemoveMilestone = (idx: number) => {
    if (milestones.length <= 1) return;
    setMilestones(milestones.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        title,
        description,
        clientName,
        clientEmail,
        freelancerName,
        freelancerEmail,
        freelancerCountry,
        currency,
        targetPayoutCurrency,
        payoutMethod,
        totalAmount,
        autoHedgeStablecoin: autoHedge,
        payoutDetails: {
          bankName,
          accountNumber,
          bankCode,
          mobileNumber,
          networkProvider,
          cryptoWalletAddress: cryptoAddress,
        },
        milestones,
      };

      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create escrow contract');
      }
      const created = await res.json().catch(() => ({}));
      onCreated(created?.contract?.id);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error creating contract');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel max-w-2xl w-full p-6 sm:p-8 rounded-2xl border border-slate-800 my-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-2.5 mb-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Create Cross-Border Escrow Contract</h3>
            <p className="text-xs text-slate-400">
              Provisions a dedicated Blaaiz Virtual Account for client collections with automatic USDC FX hedging.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* Title & Description */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Contract / Project Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Next.js SaaS MVP & Payment Integration"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Scope of Work</label>
              <textarea
                rows={2}
                placeholder="Describe deliverables and expectations..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Client & Contractor Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Client Entity / Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Horizon Labs Inc (San Francisco)"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Client Email *</label>
              <input
                type="email"
                required
                placeholder="billing@horizonlabs.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Freelancer / Agency Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Tunde Balogun"
                value={freelancerName}
                onChange={(e) => setFreelancerName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Freelancer Email *</label>
              <input
                type="email"
                required
                placeholder="tunde@email.com"
                value={freelancerEmail}
                onChange={(e) => setFreelancerEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
              <p className="mt-1 text-[11px] text-slate-500">They’ll see this project when they sign in with this email.</p>
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Freelancer Country</label>
              <select
                value={freelancerCountry}
                onChange={(e) => {
                  setFreelancerCountry(e.target.value);
                  if (e.target.value === 'Kenya') {
                    setTargetPayoutCurrency('KES');
                    setPayoutMethod('mobile_money');
                  } else if (e.target.value === 'Ghana') {
                    setTargetPayoutCurrency('GHS');
                    setPayoutMethod('mobile_money');
                  } else {
                    setTargetPayoutCurrency('NGN');
                    setPayoutMethod('bank_transfer');
                  }
                }}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Nigeria">Nigeria</option>
                <option value="Kenya">Kenya</option>
                <option value="Ghana">Ghana</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Global (Crypto)">Global (USDC / USDT)</option>
              </select>
            </div>
          </div>

          {/* Currency & Financial Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Escrow Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 font-bold"
              >
                <option value="USD">USD (US ACH/Wire Virtual Account)</option>
                <option value="EUR">EUR (SEPA IBAN Virtual Account)</option>
                <option value="GBP">GBP (UK ClearBank Sort Code)</option>
                <option value="CAD">CAD (Interac Auto-Deposit)</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Total Contract Amount *</label>
              <input
                type="number"
                required
                min={10}
                value={totalAmount}
                onChange={(e) => setTotalAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Target Payout Rail</label>
              <select
                value={targetPayoutCurrency}
                onChange={(e) => setTargetPayoutCurrency(e.target.value as PayoutCurrency)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 font-bold"
              >
                <option value="NGN">NGN (Nigeria Instant NIP)</option>
                <option value="KES">KES (Kenya M-Pesa / Bank)</option>
                <option value="GHS">GHS (Ghana Mobile Money)</option>
                <option value="USDC">USDC (Polygon Stablecoin Rail)</option>
              </select>
            </div>
          </div>

          {/* Payout Details Section */}
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="text-xs font-semibold text-slate-200 mb-2">
              Contractor Disbursement Destination
            </div>
            {targetPayoutCurrency === 'NGN' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">NUBAN Account Number</label>
                  <input
                    type="text"
                    required
                    placeholder="10 digit account number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-white font-mono"
                  />
                </div>
              </div>
            )}

            {targetPayoutCurrency === 'KES' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Mobile Money Provider</label>
                  <input
                    type="text"
                    value={networkProvider}
                    onChange={(e) => setNetworkProvider(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">M-Pesa Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="+2547XXXXXXXX"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-white font-mono"
                  />
                </div>
              </div>
            )}

            {targetPayoutCurrency === 'USDC' && (
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Polygon USDC Wallet Address</label>
                <input
                  type="text"
                  required
                  placeholder="0x..."
                  value={cryptoAddress}
                  onChange={(e) => setCryptoAddress(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-white font-mono text-xs"
                />
              </div>
            )}
          </div>

          {/* Auto-Hedge Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
              <div>
                <div className="font-semibold text-emerald-300">Enable FX Devaluation Shield</div>
                <div className="text-[11px] text-slate-400">
                  Auto-swaps incoming deposit to USDC to guarantee zero inflation loss during escrow.
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={autoHedge}
              onChange={(e) => setAutoHedge(e.target.checked)}
              className="h-4 w-4 rounded accent-emerald-500"
            />
          </div>

          {/* Milestones Builder */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-200">Milestone Allocations</span>
              <button
                type="button"
                onClick={handleAddMilestone}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Milestone</span>
              </button>
            </div>

            <div className="space-y-2">
              {milestones.map((m, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <input
                    type="text"
                    required
                    placeholder="Milestone title"
                    value={m.title}
                    onChange={(e) => {
                      const updated = [...milestones];
                      updated[idx].title = e.target.value;
                      setMilestones(updated);
                    }}
                    className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white"
                  />
                  <input
                    type="number"
                    required
                    placeholder="Amount"
                    value={m.amount}
                    onChange={(e) => {
                      const updated = [...milestones];
                      updated[idx].amount = Number(e.target.value);
                      setMilestones(updated);
                    }}
                    className="w-24 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-mono"
                  />
                  {milestones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMilestone(idx)}
                      className="text-slate-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg shadow-lg shadow-emerald-500/20 flex items-center space-x-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Provisioning Blaaiz Account...</span>
                </>
              ) : (
                <span>Launch Escrow Contract</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
