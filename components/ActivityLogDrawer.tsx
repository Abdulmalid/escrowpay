'use client';

import React from 'react';
import { X, Terminal, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import { BlaaizLogEntry } from '@/lib/types';

interface ActivityLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: BlaaizLogEntry[];
  onRefresh: () => void;
}

export default function ActivityLogDrawer({
  isOpen,
  onClose,
  logs,
  onRefresh,
}: ActivityLogDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
              <Terminal className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Blaaiz Platform Live Activity</h3>
              <p className="text-[11px] text-slate-400">Real-time audit log of API calls & signed webhooks</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onRefresh}
              className="p-1 text-slate-400 hover:text-white transition"
              title="Refresh Logs"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Logs Stream */}
        <div className="my-4 space-y-3">
          {logs.length === 0 ? (
            <div className="text-xs text-slate-500 py-6 text-center">No logs recorded yet.</div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5 font-mono text-[11px]">
                    {log.type === 'API_CALL' && (
                      <span className="bg-blue-500/10 text-blue-400 px-1.5 py-0.2 rounded border border-blue-500/20">
                        API CALL
                      </span>
                    )}
                    {log.type === 'WEBHOOK_RECEIVED' && (
                      <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/20">
                        WEBHOOK
                      </span>
                    )}
                    {log.type === 'SWAP_EXECUTED' && (
                      <span className="bg-teal-500/10 text-teal-300 px-1.5 py-0.2 rounded border border-teal-500/20">
                        SWAP
                      </span>
                    )}
                    {log.type === 'PAYOUT_DISBURSED' && (
                      <span className="bg-amber-500/10 text-amber-400 px-1.5 py-0.2 rounded border border-amber-500/20">
                        PAYOUT
                      </span>
                    )}
                    <span className="text-slate-400 text-[10px]">{log.endpoint}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                <div className="font-semibold text-slate-200 mt-1">{log.title}</div>

                {log.details && (
                  <pre className="mt-2 p-2 rounded bg-slate-950 text-[10px] text-slate-400 font-mono overflow-x-auto border border-slate-900">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400">
        All API requests are scoped with OAuth2 Principle of Least Privilege.
      </div>
    </div>
  );
}
