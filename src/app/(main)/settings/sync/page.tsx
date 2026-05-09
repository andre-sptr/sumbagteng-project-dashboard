'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  History,
  Database,
  FileSpreadsheet,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Info,
  Play,
  Square
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useWebSocket } from '@/hooks/useWebSocket';

interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  started_at: string;
  completed_at?: string;
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_failed: number;
  error_message?: string;
}

interface SyncStatus {
  isRunning?: boolean;
  latestSync?: SyncLog;
}

function SkeletonCard() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-slate-100" />
        <div className="h-4 w-28 bg-slate-100 rounded" />
      </div>
      <div className="h-7 w-20 bg-slate-100 rounded mb-2" />
      <div className="h-3 w-36 bg-slate-100 rounded" />
    </div>
  );
}

export default function SyncSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [schedulerLoading, setSchedulerLoading] = useState(false);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [history, setHistory] = useState<SyncLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const { subscribe, unsubscribe } = useWebSocket();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, historyRes] = await Promise.all([
        fetch('/api/sync/status').then(res => res.json()),
        fetch('/api/sync/history').then(res => res.json())
      ]);

      if (statusRes.success) setStatus(statusRes.data);
      if (historyRes.success) setHistory(historyRes.data);
    } catch {
      setError('Gagal mengambil data sinkronisasi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchData();
    }, 0);

    const handleSyncCompleted = (data: Record<string, unknown>) => {
      console.log('[SyncSettings] Sync completed event:', data);
      void fetchData();
      setSyncing(false);
    };

    subscribe('sync.completed', handleSyncCompleted);
    return () => {
      window.clearTimeout(timeoutId);
      unsubscribe('sync.completed', handleSyncCompleted);
    };
  }, [fetchData, subscribe, unsubscribe]);

  const handleManualSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        void fetchData();
      } else {
        setError(data.message || 'Gagal memulai sinkronisasi');
      }
    } catch {
      setError('Terjadi kesalahan jaringan');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleScheduler = async () => {
    if (schedulerLoading) return;
    setSchedulerLoading(true);
    setError(null);
    const action = status?.isRunning ? 'stop' : 'start';
    try {
      const res = await fetch('/api/sync/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(prev => prev ? { ...prev, isRunning: data.data.isRunning } : prev);
      } else {
        setError(data.message || 'Gagal mengubah status scheduler');
      }
    } catch {
      setError('Terjadi kesalahan jaringan');
    } finally {
      setSchedulerLoading(false);
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRow(prev => prev === id ? null : id);
  };

  const latestSync = status?.latestSync;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Data Synchronization
          </h1>
          <p className="text-slate-500 mt-1">
            Kelola dan monitor sinkronisasi data dari Google Spreadsheet
          </p>
        </div>

        <button
          onClick={handleManualSync}
          disabled={syncing}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all shadow-lg
            ${syncing
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-200 active:scale-95'}
          `}
        >
          <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-700">Auto-Scheduler</h3>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-3 h-3 rounded-full ${status?.isRunning ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                <span className="text-xl font-bold text-slate-800">
                  {status?.isRunning ? 'Running' : 'Stopped'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">Interval: Hourly (Setiap jam)</p>
              <button
                onClick={handleToggleScheduler}
                disabled={schedulerLoading}
                className={`
                  flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all
                  ${schedulerLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  ${status?.isRunning
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'}
                `}
              >
                {status?.isRunning
                  ? <><Square className="w-3 h-3" /> Stop Scheduler</>
                  : <><Play className="w-3 h-3" /> Start Scheduler</>}
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <History className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-700">Last Sync</h3>
              </div>
              <div className="text-xl font-bold text-slate-800">
                {latestSync ? format(new Date(latestSync.started_at), 'HH:mm:ss', { locale: id }) : '--:--:--'}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {latestSync ? format(new Date(latestSync.started_at), 'dd MMMM yyyy', { locale: id }) : 'Belum pernah sync'}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-700">Health Status</h3>
              </div>
              <div className="flex items-center gap-2">
                {latestSync?.status === 'SUCCESS' ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    <span className="text-xl font-bold text-slate-800">Healthy</span>
                  </>
                ) : latestSync?.status === 'FAILED' ? (
                  <>
                    <XCircle className="w-6 h-6 text-red-500" />
                    <span className="text-xl font-bold text-slate-800">Issues</span>
                  </>
                ) : (
                  <span className="text-xl font-bold text-slate-800">Unknown</span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-2">Berdasarkan hasil sync terakhir</p>
            </div>
          </>
        )}
      </div>

      {/* Sync Statistics */}
      {latestSync && (
        <div className="bg-slate-900 text-white rounded-2xl p-8 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <FileSpreadsheet className="w-32 h-32" />
          </div>

          <div className="relative z-10">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-400" />
              Latest Sync Detail
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <p className="text-slate-400 text-sm mb-1">Processed</p>
                <p className="text-3xl font-bold">{latestSync.records_processed}</p>
              </div>
              <div>
                <p className="text-emerald-400 text-sm mb-1">Created</p>
                <p className="text-3xl font-bold">{latestSync.records_created}</p>
              </div>
              <div>
                <p className="text-blue-400 text-sm mb-1">Updated</p>
                <p className="text-3xl font-bold">{latestSync.records_updated}</p>
              </div>
              <div>
                <p className="text-red-400 text-sm mb-1">Failed</p>
                <p className="text-3xl font-bold">{latestSync.records_failed}</p>
              </div>
            </div>

            {latestSync.error_message && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                <strong>Error:</strong> {latestSync.error_message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sync History Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <History className="w-5 h-5 text-slate-400" />
            Sync History
          </h3>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Showing last 20 entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Records</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((log) => {
                const duration = log.completed_at
                  ? Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)
                  : null;
                const isExpanded = expandedRow === log.id;

                return (
                  <React.Fragment key={log.id}>
                    <tr
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                      onClick={() => toggleRow(log.id)}
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-700">
                          {format(new Date(log.started_at), 'HH:mm:ss', { locale: id })}
                        </p>
                        <p className="text-xs text-slate-400">
                          {format(new Date(log.started_at), 'dd MMM yyyy', { locale: id })}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold px-2 py-1 rounded bg-slate-100 text-slate-600 uppercase tracking-tight">
                          {log.sync_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {log.status === 'SUCCESS' ? (
                            <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                              <CheckCircle2 className="w-4 h-4" /> Success
                            </span>
                          ) : log.status === 'FAILED' ? (
                            <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
                              <XCircle className="w-4 h-4" /> Failed
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-blue-600 text-sm font-medium animate-pulse">
                              <RefreshCw className="w-4 h-4 animate-spin" /> In Progress
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-slate-600 font-medium">{log.records_processed} total</span>
                          <div className="flex gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" title="Created"></span>
                            <span className="w-2 h-2 rounded-full bg-blue-400" title="Updated"></span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {duration !== null ? `${duration}s` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                          {isExpanded
                            ? <ChevronDown className="w-5 h-5" />
                            : <ChevronRight className="w-5 h-5" />}
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            <div className="bg-white rounded-xl p-3 border border-slate-100">
                              <p className="text-xs text-slate-400 mb-1">Processed</p>
                              <p className="text-xl font-bold text-slate-700">{log.records_processed}</p>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-slate-100">
                              <p className="text-xs text-emerald-500 mb-1">Created</p>
                              <p className="text-xl font-bold text-slate-700">{log.records_created}</p>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-slate-100">
                              <p className="text-xs text-blue-500 mb-1">Updated</p>
                              <p className="text-xl font-bold text-slate-700">{log.records_updated}</p>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-slate-100">
                              <p className="text-xs text-red-400 mb-1">Failed</p>
                              <p className="text-xl font-bold text-slate-700">{log.records_failed}</p>
                            </div>
                          </div>
                          {log.error_message && (
                            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
                              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <span>{log.error_message}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {history.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Belum ada riwayat sinkronisasi
                  </td>
                </tr>
              )}

              {loading && (
                <>
                  {[1, 2, 3].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-4 w-16 bg-slate-100 rounded mb-1" />
                        <div className="h-3 w-24 bg-slate-100 rounded" />
                      </td>
                      <td className="px-6 py-4"><div className="h-5 w-16 bg-slate-100 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-100 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-100 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-8 bg-slate-100 rounded" /></td>
                      <td className="px-6 py-4"></td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
