// BOQ comparison page — upload Excel and compare against UT/AANWIJZING data
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Equal,
  FileSearch,
  Loader2,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  Upload,
  X,
} from 'lucide-react';
import type { ApiResponse } from '@/lib/response';

// ─── Types ──────────────────────────────────────────────────────────────
interface ProjectOption {
  nama_lop: string;
  id_ihld: string;
}

type Status = 'sama' | 'baru' | 'hilang' | 'berubah';

interface DetailRow {
  designator: string;
  status: Status;
  vol_upload: number;
  vol_db: number;
  selisih_vol: number;
  cost_upload: number;
  cost_db: number;
  selisih_cost: number;
}

interface CheckSummary {
  designator_upload: number;
  designator_db: number;
  count_sama: number;
  count_baru: number;
  count_hilang: number;
  count_berubah: number;
  total_cost_upload: number;
  total_cost_db: number;
  selisih_cost: number;
}

interface CheckResponse {
  source: 'ut' | 'aanwijzing' | null;
  message?: string;
  summary: CheckSummary | null;
  details: DetailRow[];
}

interface BoqProjectsResponse {
  projects: ProjectOption[];
}

// ─── Formatters ─────────────────────────────────────────────────────────
const numberFmt = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });
const currencyFmt = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

function fmtNum(v: number) {
  return Number.isFinite(v) ? numberFmt.format(v) : '0';
}
function fmtCur(v: number) {
  return Number.isFinite(v) ? currencyFmt.format(v) : 'Rp0';
}

// ─── Status Helpers ─────────────────────────────────────────────────────
const STATUS_CONFIG: Record<Status, { label: string; cls: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  sama: {
    label: 'Sama',
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    icon: CheckCircle2,
  },
  baru: {
    label: 'Baru',
    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    icon: Plus,
  },
  hilang: {
    label: 'Hilang',
    cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    icon: Minus,
  },
  berubah: {
    label: 'Berubah',
    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    icon: RefreshCw,
  },
};

const ITEMS_PER_PAGE = 15;

// ─── KPI Card ───────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
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
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{sub}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────
export default function CekBoqPage() {
  // Project list
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Project selector
  const [selectedProject, setSelectedProject] = useState('');
  const [searchProject, setSearchProject] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  // File upload
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Result
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Table
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<Status | ''>('');

  // Load projects
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/boq');
        const json = (await res.json()) as ApiResponse<BoqProjectsResponse>;
        if (active && json.success) {
          setProjects(json.data?.projects ?? []);
        }
      } catch {
        // ignore
      } finally {
        if (active) setLoadingProjects(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // Derived
  const selectedLabel = useMemo(() => {
    if (!selectedProject) return '';
    const p = projects.find((x) => x.id_ihld === selectedProject);
    return p ? `${p.nama_lop} (${p.id_ihld})` : selectedProject;
  }, [projects, selectedProject]);

  const filteredProjects = useMemo(() => {
    const kw = searchProject.toLowerCase();
    return projects.filter(
      (p) => p.nama_lop.toLowerCase().includes(kw) || p.id_ihld.toLowerCase().includes(kw)
    );
  }, [projects, searchProject]);

  const filteredRows = useMemo(() => {
    if (!result?.details) return [];
    let rows = result.details;
    if (statusFilter) {
      rows = rows.filter((r) => r.status === statusFilter);
    }
    const kw = search.trim().toLowerCase();
    if (kw) {
      rows = rows.filter((r) => r.designator.toLowerCase().includes(kw));
    }
    return rows;
  }, [result, search, statusFilter]);

  const totalPages = Math.ceil(filteredRows.length / ITEMS_PER_PAGE);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRows.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRows, currentPage]);

  // Reset page when filters change
  const [prevFilters, setPrevFilters] = useState({ search, statusFilter });
  if (search !== prevFilters.search || statusFilter !== prevFilters.statusFilter) {
    setPrevFilters({ search, statusFilter });
    setCurrentPage(1);
  }

  // Handlers
  const handleFileChange = (f: File | undefined) => {
    if (!f) return;
    if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) {
      setError('Format file harus .xlsx atau .xls');
      return;
    }
    setFile(f);
    setError(null);
  };

  const handleCheck = async () => {
    if (!selectedProject) {
      setError('Pilih project terlebih dahulu');
      return;
    }
    if (!file) {
      setError('Pilih file Excel terlebih dahulu');
      return;
    }

    setIsChecking(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('id_ihld', selectedProject);

      const res = await fetch('/api/boq/check', { method: 'POST', body: formData });
      const json = (await res.json()) as ApiResponse<CheckResponse>;

      if (!json.success) {
        setError(json.error || json.message || 'Gagal mengecek BOQ');
        return;
      }

      setResult(json.data ?? null);
    } catch {
      setError('Gagal mengecek BOQ. Periksa koneksi Anda.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setSearch('');
    setStatusFilter('');
    setCurrentPage(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sourceLabel = result?.source === 'ut' ? 'BOQ UT' : result?.source === 'aanwijzing' ? 'BOQ AANWIJZING' : null;
  const summary = result?.summary;

  return (
    <div className="w-full space-y-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Cek BOQ
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Upload file Excel BOQ dan bandingkan dengan data UT / AANWIJZING yang tersimpan.
        </p>
      </div>

      {/* ── Error Banner ────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto shrink-0 p-0.5 hover:bg-red-100 dark:hover:bg-red-800/50 rounded">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Upload Section ──────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileSearch size={18} className="text-blue-600" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Perbandingan BOQ
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Project Selector */}
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
              Pilih Project <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={showProjectDropdown ? searchProject : selectedLabel}
                onChange={(e) => {
                  setSearchProject(e.target.value);
                  setShowProjectDropdown(true);
                  if (!e.target.value) setSelectedProject('');
                }}
                onFocus={() => setShowProjectDropdown(true)}
                onBlur={() => setTimeout(() => setShowProjectDropdown(false), 200)}
                disabled={loadingProjects}
                className="w-full h-10 px-3 pr-9 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
                placeholder="Cari project..."
                autoComplete="off"
              />
              <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none transition-transform ${showProjectDropdown ? 'rotate-180' : ''}`} />
            </div>

            {showProjectDropdown && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredProjects.length > 0 ? (
                  filteredProjects.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSelectedProject(p.id_ihld);
                        setSearchProject(p.nama_lop);
                        setShowProjectDropdown(false);
                        setResult(null);
                      }}
                      className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">{p.nama_lop}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{p.id_ihld}</div>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-sm text-gray-500 dark:text-gray-400">Tidak ada hasil</div>
                )}
              </div>
            )}
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
              File BOQ Excel <span className="text-red-500">*</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileChange(e.dataTransfer.files[0]); }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              className={`relative flex items-center justify-center gap-2 h-10 px-3 rounded-lg cursor-pointer transition-all border-2 border-dashed ${
                isDragging
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : file
                    ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-700'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
                className="hidden"
              />
              <Upload size={16} className={`shrink-0 ${file ? 'text-emerald-500' : 'text-gray-400'}`} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                {file ? file.name : 'Klik atau drag file Excel'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={handleCheck}
            disabled={isChecking || !selectedProject || !file}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {isChecking ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileSearch size={16} />
            )}
            Cek Perbandingan
          </button>
          {(file || result) && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={16} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── No Source Warning ───────────────────────────────── */}
      {result && !result.source && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>{result.message || 'Tidak ada data BOQ UT atau AANWIJZING untuk project ini.'}</span>
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────── */}
      {result && summary && (
        <>
          {/* Source badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Dibandingkan dengan:</span>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
              result.source === 'ut'
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
            }`}>
              {sourceLabel}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              — {selectedLabel}
            </span>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              icon={Package}
              label="Designator Upload"
              value={fmtNum(summary.designator_upload)}
              sub={`Database: ${fmtNum(summary.designator_db)} designator`}
              color="bg-blue-600"
            />
            <KpiCard
              icon={Equal}
              label="Sama"
              value={fmtNum(summary.count_sama)}
              sub={`Berubah: ${fmtNum(summary.count_berubah)}`}
              color="bg-emerald-600"
            />
            <KpiCard
              icon={Plus}
              label="Baru / Hilang"
              value={`${fmtNum(summary.count_baru)} / ${fmtNum(summary.count_hilang)}`}
              sub={`Baru di upload / hilang dari DB`}
              color="bg-amber-600"
            />
            <KpiCard
              icon={summary.selisih_cost >= 0 ? ArrowUpRight : ArrowDownRight}
              label="Selisih Total Cost"
              value={fmtCur(summary.selisih_cost)}
              sub={`Upload: ${fmtCur(summary.total_cost_upload)}`}
              color={summary.selisih_cost >= 0 ? 'bg-rose-600' : 'bg-indigo-600'}
            />
          </div>

          {/* Detail Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Detail Perbandingan
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {fmtNum(filteredRows.length)} dari {fmtNum(result.details.length)} designator
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as Status | '')}
                  className="h-10 px-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Semua Status</option>
                  <option value="sama">Sama</option>
                  <option value="berubah">Berubah</option>
                  <option value="baru">Baru</option>
                  <option value="hilang">Hilang</option>
                </select>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari designator..."
                    className="w-full h-10 pl-9 pr-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {filteredRows.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                      <tr>
                        <th className="w-[20%] px-3 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Designator
                        </th>
                        <th className="w-[10%] px-3 py-3 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="w-[10%] px-3 py-3 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Vol Upload
                        </th>
                        <th className="w-[10%] px-3 py-3 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Vol {result.source === 'ut' ? 'UT' : 'AANW.'}
                        </th>
                        <th className="w-[10%] px-3 py-3 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Selisih Vol
                        </th>
                        <th className="w-[14%] px-3 py-3 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Cost Upload
                        </th>
                        <th className="w-[14%] px-3 py-3 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Cost {result.source === 'ut' ? 'UT' : 'AANW.'}
                        </th>
                        <th className="w-[12%] px-3 py-3 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Selisih Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                      {paginatedRows.map((row) => {
                        const cfg = STATUS_CONFIG[row.status];
                        const StatusIcon = cfg.icon;

                        return (
                          <tr
                            key={row.designator}
                            className={`transition-colors ${
                              row.status === 'baru'
                                ? 'bg-blue-50/40 dark:bg-blue-900/10'
                                : row.status === 'hilang'
                                  ? 'bg-red-50/40 dark:bg-red-900/10'
                                  : row.status === 'berubah'
                                    ? 'bg-amber-50/40 dark:bg-amber-900/10'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                            }`}
                          >
                            <td className="px-3 py-3">
                              <div className="text-xs font-bold text-gray-900 dark:text-white truncate" title={row.designator}>
                                {row.designator}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${cfg.cls}`}>
                                <StatusIcon size={10} />
                                {cfg.label}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center text-xs text-gray-700 dark:text-gray-300 tabular-nums">
                              {fmtNum(row.vol_upload)}
                            </td>
                            <td className="px-3 py-3 text-center text-xs text-gray-700 dark:text-gray-300 tabular-nums">
                              {fmtNum(row.vol_db)}
                            </td>
                            <td className={`px-3 py-3 text-center text-xs font-bold tabular-nums ${
                              row.selisih_vol > 0
                                ? 'text-red-600 dark:text-red-400'
                                : row.selisih_vol < 0
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {row.selisih_vol > 0 ? '+' : ''}{fmtNum(row.selisih_vol)}
                            </td>
                            <td className="px-3 py-3 text-center text-xs text-gray-700 dark:text-gray-300 tabular-nums truncate">
                              {fmtCur(row.cost_upload)}
                            </td>
                            <td className="px-3 py-3 text-center text-xs text-gray-700 dark:text-gray-300 tabular-nums truncate">
                              {fmtCur(row.cost_db)}
                            </td>
                            <td className={`px-3 py-3 text-center text-xs font-bold tabular-nums truncate ${
                              row.selisih_cost > 0
                                ? 'text-red-600 dark:text-red-400'
                                : row.selisih_cost < 0
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {row.selisih_cost > 0 ? '+' : ''}{fmtCur(row.selisih_cost)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="bg-white dark:bg-gray-900 px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Menampilkan{' '}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                      </span>{' '}hingga{' '}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {Math.min(currentPage * ITEMS_PER_PAGE, filteredRows.length)}
                      </span>{' '}dari{' '}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {filteredRows.length}
                      </span>{' '}designator
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="inline-flex items-center p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="inline-flex items-center p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="px-6 py-14 text-center">
                <Package size={42} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Tidak ada designator yang cocok.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Coba ubah filter atau kata kunci pencarian.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
