'use client';

import React, { useState } from 'react';
import {
  Contract,
  Milestone,
} from '@/lib/types';
import {
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  Building2,
  ArrowRight,
  Send,
  Loader2,
  Lock,
  Sparkles,
} from 'lucide-react';

interface ContractCardProps {
  contract: Contract;
  onRefresh: () => void;
  onSimulateDeposit: (contractId: string) => void;
  onTriggerPayout: (contractId: string, milestoneId: string) => Promise<void>;
  onSubmitDeliverable: (contractId: string, milestoneId: string, url: string) => Promise<void>;
}

export default function ContractCard({
  contract,
  onRefresh,
  onSimulateDeposit,
  onTriggerPayout,
  onSubmitDeliverable,
}: ContractCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [payoutLoadingId, setPayoutLoadingId] = useState<string | null>(null);
  const [submissionModalMilestone, setSubmissionModalMilestone] = useState<Milestone | null>(null);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePayout = async (milestoneId: string) => {
    setPayoutLoadingId(milestoneId);
    try {
      await onTriggerPayout(contract.id, milestoneId);
    } finally {
      setPayoutLoadingId(null);
    }
  };

  const handleDeliverableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionModalMilestone || !submissionUrl.trim()) return;
    setSubmitting(true);
    try {
      await onSubmitDeliverable(contract.id, submissionModalMilestone.id, submissionUrl);
      setSubmissionModalMilestone(null);
      setSubmissionUrl('');
    } finally {
      setSubmitting(false);
    }
  };

  const va = contract.virtualAccount;
  const isAwaitingDeposit = contract.status === 'AWAITING_DEPOSIT';
  const isHedged = contract.status === 'ESCROWED_HEDGED' || contract.status === 'WORK_IN_PROGRESS';
  const isCompleted = contract.status === 'COMPLETED';

  const completedMilestones = contract.milestones.filter((m) => m.status === 'DISBURSED').length;
  const progressPercent = Math.round((completedMilestones / contract.milestones.length) * 100);

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-xl mb-6 transition hover:border-slate-700">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2.5">
            <h3 className="text-lg font-bold text-white tracking-tight">{contract.title}</h3>
            {isAwaitingDeposit && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center space-x-1">
                <Clock className="h-3 w-3 mr-1" />
                Awaiting Deposit
              </span>
            )}
            {isHedged && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1 pulse-glow">
                <Lock className="h-3 w-3 mr-1 text-emerald-400" />
                Escrowed & USDC Hedged
              </span>
            )}
            {isCompleted && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center space-x-1">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Completed & Settled
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">{contract.description}</p>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-300">
            <span>
              Client: <strong className="text-white">{contract.clientName}</strong>
            </span>
            <span className="text-slate-600">•</span>
            <span>
              Freelancer: <strong className="text-emerald-400">{contract.freelancerName}</strong> ({contract.freelancerCountry})
            </span>
            <span className="text-slate-600">•</span>
            <span>
              Payout Rail:{' '}
              <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono">
                {contract.targetPayoutCurrency} ({contract.payoutMethod.replace('_', ' ')})
              </span>
            </span>
          </div>
        </div>

        {/* Amount Badge */}
        <div className="flex items-center lg:items-end flex-col bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <div className="text-xs text-slate-400">Total Escrow Value</div>
          <div className="text-2xl font-black text-white">
            {contract.currency} {contract.totalAmount.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-400 mt-0.5">
            Target: ~{contract.targetPayoutCurrency}{' '}
            {contract.targetPayoutCurrency === 'NGN'
              ? (contract.totalAmount * 1680).toLocaleString()
              : (contract.totalAmount * 130).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Main Grid: Virtual Account & FX Shield */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 my-5">
        {/* Virtual Account Card (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/60 rounded-xl p-4 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
              <Building2 className="h-4 w-4 text-emerald-400" />
              <span>Dedicated Blaaiz Virtual Account ({contract.currency})</span>
            </div>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md font-mono">
              Ref: {va?.merchantReference}
            </span>
          </div>

          {va ? (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <span className="text-slate-400">Clearing Bank:</span>
                <span className="font-medium text-white">{va.bankName}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <span className="text-slate-400">Beneficiary / Account Name:</span>
                <span className="font-medium text-white">{va.accountName}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400">Account / IBAN</div>
                    <div className="font-mono text-white text-xs font-semibold">{va.accountNumber}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(va.accountNumber, 'acc')}
                    className="p-1 text-slate-400 hover:text-emerald-400 transition"
                    title="Copy Account Number"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400">
                      {va.routingNumber ? 'Routing (ACH/Wire)' : va.sortCode ? 'Sort Code' : 'BIC/SWIFT'}
                    </div>
                    <div className="font-mono text-white text-xs font-semibold">
                      {va.routingNumber || va.sortCode || va.swiftBic}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(va.routingNumber || va.sortCode || va.swiftBic || '', 'route')
                    }
                    className="p-1 text-slate-400 hover:text-emerald-400 transition"
                    title="Copy Routing Number"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {isAwaitingDeposit && (
                <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs text-amber-300">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                    <span>Client can transfer directly via local bank rails.</span>
                  </div>
                  <button
                    onClick={() => onSimulateDeposit(contract.id)}
                    className="px-2.5 py-1 text-xs font-semibold bg-amber-500 text-slate-950 rounded hover:bg-amber-400 transition shrink-0"
                  >
                    Simulate Inbound Deposit
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-400">Generating Blaaiz BaaS Account...</div>
          )}
        </div>

        {/* FX Devaluation Shield (5 cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-emerald-950/40 to-slate-900/60 rounded-xl p-4 border border-emerald-500/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
                <span>FX Devaluation Shield</span>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                Auto-Hedged in USDC
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              When client funds deposit, Blaaiz automatically executes a wallet swap to{' '}
              <strong className="text-white">USDC stablecoin</strong>, protecting the contractor against rapid local currency inflation during delivery.
            </p>

            {contract.hedgeDetails ? (
              <div className="mt-3 p-2.5 rounded-lg bg-slate-950/60 border border-emerald-500/30 text-xs">
                <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                  <span>Initial Swap Rate:</span>
                  <span className="text-slate-200">1 USD = ₦{contract.hedgeDetails.initialFxRate}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                  <span>Current Market Rate:</span>
                  <span className="text-slate-200">1 USD = ₦{contract.hedgeDetails.currentFxRate}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-800 text-emerald-400 font-bold">
                  <span>Purchasing Power Saved:</span>
                  <span className="text-sm">₦{contract.hedgeDetails.valueSavedNgn.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="mt-3 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 text-[11px] text-slate-400">
                Awaiting client deposit to initiate automatic USDC swap.
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center text-[10px] text-slate-400 space-x-1">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Guaranteed zero currency slippage for milestone releases.</span>
          </div>
        </div>
      </div>

      {/* Milestones Section */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Milestones Breakdown ({completedMilestones}/{contract.milestones.length} Completed)
          </div>
          <div className="w-32 bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        <div className="space-y-3">
          {contract.milestones.map((milestone, idx) => {
            const isMilestonePending = milestone.status === 'PENDING_DEPOSIT';
            const isMilestoneEscrowed = milestone.status === 'ESCROWED';
            const isMilestoneSubmitted = milestone.status === 'SUBMITTED';
            const isMilestoneDisbursed = milestone.status === 'DISBURSED';

            return (
              <div
                key={milestone.id}
                className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-slate-700/80 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-400 font-mono">0{idx + 1}</span>
                    <h4 className="text-sm font-semibold text-white">{milestone.title}</h4>
                    {isMilestoneDisbursed && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                        Disbursed
                      </span>
                    )}
                    {isMilestoneSubmitted && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                        Work Submitted
                      </span>
                    )}
                    {isMilestoneEscrowed && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 font-medium">
                        Funded in Escrow
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{milestone.description}</p>

                  {milestone.submissionUrl && (
                    <div className="flex items-center space-x-1.5 text-xs text-teal-400 pt-1">
                      <ExternalLink className="h-3 w-3" />
                      <a
                        href={milestone.submissionUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:text-teal-300"
                      >
                        {milestone.submissionUrl}
                      </a>
                    </div>
                  )}

                  {milestone.payoutRef && (
                    <div className="text-[10px] text-slate-400 font-mono">
                      Blaaiz Payout Ref: <span className="text-emerald-400">{milestone.payoutRef}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">
                      {contract.currency} {milestone.amount.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400">{milestone.percentage}% of contract</div>
                  </div>

                  {/* Actions */}
                  {isMilestoneEscrowed && (
                    <button
                      onClick={() => setSubmissionModalMilestone(milestone)}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-lg border border-slate-700 transition flex items-center space-x-1"
                    >
                      <Send className="h-3 w-3" />
                      <span>Submit Work</span>
                    </button>
                  )}

                  {isMilestoneSubmitted && (
                    <button
                      onClick={() => handlePayout(milestone.id)}
                      disabled={payoutLoadingId === milestone.id}
                      className="px-3.5 py-1.5 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 rounded-lg shadow-md shadow-emerald-500/20 transition flex items-center space-x-1.5"
                    >
                      {payoutLoadingId === milestone.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Disbursing Blaaiz Rail...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Approve & Release Payout</span>
                        </>
                      )}
                    </button>
                  )}

                  {isMilestoneDisbursed && (
                    <div className="flex items-center space-x-1 text-xs text-emerald-400 font-medium px-2 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Settled</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Submission Modal */}
      {submissionModalMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-800">
            <h4 className="text-base font-bold text-white mb-1">
              Submit Milestone Deliverable
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              {submissionModalMilestone.title} ({contract.currency}{' '}
              {submissionModalMilestone.amount})
            </p>

            <form onSubmit={handleDeliverableSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Deliverable Link (GitHub PR, Figma, Staging URL)
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://github.com/org/repo/pull/42"
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSubmissionModalMilestone(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg"
                >
                  {submitting ? 'Submitting...' : 'Confirm Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
