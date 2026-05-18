// BoQ designator inventory and cost tracking page
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ClipboardList,
  Layers,
  Package,
  RefreshCw,
  Search,
  Wallet,
} from 'lucide-react';
import type { ApiResponse } from '@/lib/response';

interface ProjectOption {
  nama_lop: string;
  id_ihld: string;
}

interface TrackingRow {
  designator: string;
  jumlah_project?: number;
  aanwijzing_vol: number;
  aanwijzing_cost: number;
  ut_vol: number;
  ut_cost: number;
  remaining_vol: number;
  remaining_cost: number;
}

interface TrackingResponse {
  type: 'global' | 'project';
  id_ihld?: string;
  tracking: TrackingRow[];
}

interface BoqResponse {
  projects: ProjectOption[];
}

interface KpiCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  sub: string;
  color: string;
}

const numberFormatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 2,
});

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return '0';
  return numberFormatter.format(value);
}

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return 'Rp0';
  return currencyFormatter.format(value);
}

function getStatus(row: TrackingRow) {
  if (row.remaining_vol < 0 || row.remaining_cost < 0) {
    return {
      label: 'Melebihi AANWIJZING',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    };
  }

  if (row.ut_vol === 0) {
    return {
      label: 'Belum Terpakai',
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    };
  }

  if (row.remaining_vol === 0) {
    return {
      label: 'Habis',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    };
  }

  return {
    label: 'Tersisa',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  };
}

function KpiCard({ icon: Icon, label, value, sub, color }: KpiCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg ${color} text-white flex items-center justify-center shrink-0`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-xl font-black text-gray-900 dark:text-white tabular-nums truncate">
            {value}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
            {sub}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function BoqTrackingPage() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [rows, setRows] = useState<TrackingRow[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [search, setSearch] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTracking, setLoadingTracking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadProjects() {
      try {
        const res = await fetch('/api/boq');
        const response = (await res.json()) as ApiResponse<BoqResponse>;

        if (!active) return;

        if (!response.success) {
          setError(response.error || response.message || 'Gagal mengambil daftar project.');
          return;
        }

        setProjects(response.data?.projects || []);
      } catch (err) {
        if (active) {
          console.error('Failed to load BoQ projects:', err);
          setError('Gagal mengambil daftar project.');
        }
      } finally {
        if (active) setLoadingProjects(false);
      }
    }

    loadProjects();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadTracking() {
      setLoadingTracking(true);
      setError(null);

      try {
        const params = selectedProject
          ? `?id_ihld=${encodeURIComponent(selectedProject)}`
          : '';
        const res = await fetch(`/api/boq/tracking${params}`);
        const response = (await res.json()) as ApiResponse<TrackingResponse>;

        if (!active) return;

        if (!response.success) {
          setRows([]);
          setError(response.error || response.message || 'Gagal mengambil tracking BoQ.');
          return;
        }

        setRows(response.data?.tracking || []);
      } catch (err) {
        if (active) {
          console.error('Failed to load BoQ tracking:', err);
          setRows([]);
          setError('Gagal mengambil tracking BoQ.');
        }
      } finally {
        if (active) setLoadingTracking(false);
      }
    }

    loadTracking();

    return () => {
      active = false;
    };
  }, [refreshKey, selectedProject]);

  const selectedProjectLabel = useMemo(() => {
    if (!selectedProject) return 'Semua Project';
    const project = projects.find((item) => item.id_ihld === selectedProject);
    return project ? `${project.nama_lop} (${project.id_ihld})` : selectedProject;
  }, [projects, selectedProject]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return rows;

    return rows.filter((row) => row.designator.toLowerCase().includes(keyword));
  }, [rows, search]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => ({
        aanwijzingVol: acc.aanwijzingVol + row.aanwijzing_vol,
        aanwijzingCost: acc.aanwijzingCost + row.aanwijzing_cost,
        utVol: acc.utVol + row.ut_vol,
        utCost: acc.utCost + row.ut_cost,
        remainingVol: acc.remainingVol + row.remaining_vol,
        remainingCost: acc.remainingCost + row.remaining_cost,
        overAanwijzing: acc.overAanwijzing + (row.remaining_vol < 0 || row.remaining_cost < 0 ? 1 : 0),
      }),
      {
        aanwijzingVol: 0,
        aanwijzingCost: 0,
        utVol: 0,
        utCost: 0,
        remainingVol: 0,
        remainingCost: 0,
        overAanwijzing: 0,
      }
    );
  }, [rows]);

  const refreshTracking = () => {
    setRefreshKey((current) => current + 1);
  };

  const isLoading = loadingProjects || loadingTracking;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Tracking Designator
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {selectedProjectLabel}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative min-w-0 sm:min-w-[280px]">
            <select
              value={selectedProject}
              onChange={(event) => setSelectedProject(event.target.value)}
              disabled={loadingProjects}
              className="w-full h-10 px-3 pr-9 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
            >
              <option value="">Semua Project</option>
              {projects.map((project) => (
                <option key={`${project.id_ihld}-${project.nama_lop}`} value={project.id_ihld}>
                  {project.nama_lop} - {project.id_ihld}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={refreshTracking}
            disabled={loadingTracking}
            className="inline-flex h-10 items-center justify-center gap-2 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60 transition-colors"
          >
            <RefreshCw size={16} className={loadingTracking ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon={Layers}
          label="Total Designator"
          value={formatNumber(rows.length)}
          sub={`AANWIJZING ${formatNumber(totals.aanwijzingVol)} qty`}
          color="bg-blue-600"
        />
        <KpiCard
          icon={ClipboardList}
          label="Sisa Qty"
          value={formatNumber(totals.remainingVol)}
          sub={`Terpakai ${formatNumber(totals.utVol)} qty`}
          color="bg-emerald-600"
        />
        <KpiCard
          icon={Wallet}
          label="Cost Keluar"
          value={formatCurrency(totals.utCost)}
          sub={`AANWIJZING ${formatCurrency(totals.aanwijzingCost)}`}
          color="bg-indigo-600"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Melebihi AANWIJZING"
          value={formatNumber(totals.overAanwijzing)}
          sub={`Nilai sisa ${formatCurrency(totals.remainingCost)}`}
          color="bg-rose-600"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Detail Designator
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {formatNumber(filteredRows.length)} dari {formatNumber(rows.length)} designator
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari designator..."
              className="w-full h-10 pl-9 pr-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto h-9 w-9 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Memuat tracking BoQ...
            </p>
          </div>
        ) : filteredRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Designator
                  </th>
                  {!selectedProject && (
                    <th className="px-4 py-3 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Project
                    </th>
                  )}
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    AANWIJZING Qty
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Terpakai
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Sisa Qty
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cost Keluar
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Nilai Sisa
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {filteredRows.map((row) => {
                  const status = getStatus(row);
                  const usedPercent = row.aanwijzing_vol > 0
                    ? Math.min(100, Math.max(0, (row.ut_vol / row.aanwijzing_vol) * 100))
                    : row.ut_vol > 0
                      ? 100
                      : 0;

                  return (
                    <tr key={row.designator} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                            <Package size={17} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
                              {row.designator || '-'}
                            </div>
                            <div className="mt-1 h-1.5 w-32 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${row.remaining_vol < 0 ? 'bg-red-500' : 'bg-blue-500'}`}
                                style={{ width: `${usedPercent}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </td>
                      {!selectedProject && (
                        <td className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300 tabular-nums">
                          {formatNumber(row.jumlah_project || 0)}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300 tabular-nums">
                        {formatNumber(row.aanwijzing_vol)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                        {formatNumber(row.ut_vol)}
                      </td>
                      <td className={`px-4 py-3 text-right text-sm font-bold tabular-nums ${row.remaining_vol < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {formatNumber(row.remaining_vol)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300 tabular-nums whitespace-nowrap">
                        {formatCurrency(row.ut_cost)}
                      </td>
                      <td className={`px-4 py-3 text-right text-sm font-semibold tabular-nums whitespace-nowrap ${row.remaining_cost < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                        {formatCurrency(row.remaining_cost)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center min-w-[112px] px-2.5 py-1 rounded-full text-[11px] font-bold ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-14 text-center">
            <Package size={42} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Belum ada data tracking BoQ.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Import BoQ AANWIJZING dan BoQ UT agar sisa designator dapat dihitung.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
