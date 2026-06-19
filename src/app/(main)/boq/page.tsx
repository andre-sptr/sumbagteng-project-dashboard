// Bill of Quantity management and Excel import page
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Upload, Trash2, FileText, ChevronLeft, ChevronRight, X, Loader2, Eye, Plus, Save, ChevronDown, Search } from 'lucide-react';
import { normalizeBoqItems } from '@/lib/boq-items';
import { findDuplicateByIdIhld } from '@/lib/duplicate-check';
import { useConfirm } from '@/hooks/useConfirm';

interface ProjectOption {
  nama_lop: string;
  id_ihld: string;
}

interface ExcelTableRow {
  no: string;
  isSection: boolean;
  isSummary: boolean;
  designator: string;
  deskripsiPekerjaan: string;
  satuan: string;
  materialSatuan: number;
  jasaSatuan: number;
  volume: number;
  totalMaterial: number;
  totalJasa: number;
  totalHarga: number;
  keterangan: string;
}

interface ParsedBoqDetail {
  projectName: string;
  sto: string;
  tableRows: ExcelTableRow[];
}

interface BoqData {
  id: string;
  nama_lop: string;
  id_ihld: string;
  sto: string;
  batch_program: string;
  project_name: string;
  region: string;
  full_data: string;
  created_at: string;
  updated_at: string;
}

const ITEMS_PER_PAGE = 5;

export default function BoqPage() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [boqList, setBoqList] = useState<BoqData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedBoq, setSelectedBoq] = useState<BoqData | null>(null);
  const [detailData, setDetailData] = useState<ParsedBoqDetail[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    nama_lop: '',
    id_ihld: '',
    file: null as File | null,
  });
  const [searchLop, setSearchLop] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const { confirm } = useConfirm();
  const [search, setSearch] = useState('');



  const showNotification = React.useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const fetchData = React.useCallback(async () => {
    try {
      const res = await fetch('/api/boq');
      const response = await res.json();
      if (response.success) {
        setBoqList(response.data.boq || []);
        setProjects(response.data.projects || []);
      } else {
        showNotification('error', response.message || 'Gagal mengambil data');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification('error', 'Gagal mengambil data');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (mounted) await fetchData();
    };
    load();
    return () => { mounted = false; };
  }, [fetchData]);

  const handleSelectLop = (project: ProjectOption) => {
    setFormData({
      ...formData,
      nama_lop: project.nama_lop,
      id_ihld: project.id_ihld,
    });
    setSearchLop(project.nama_lop);
    setShowDropdown(false);
  };

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      showNotification('error', 'Format file harus .xlsx atau .xls');
      return;
    }
    setFormData({ ...formData, file });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file) {
      showNotification('error', 'Pilih file Excel terlebih dahulu');
      return;
    }

    const existing = findDuplicateByIdIhld(boqList, formData.id_ihld);
    if (existing) {
      const ok = await confirm({
        title: 'Project sudah ada',
        message: `Project "${formData.nama_lop}" (ID IHLD: ${formData.id_ihld}) sudah memiliki data BoQ Plan. Timpa data yang lama?`,
        confirmLabel: 'Timpa',
        cancelLabel: 'Batal',
        variant: 'warning',
      });
      if (!ok) return;
    }

    setIsUploading(true);

    try {
      const submitData = new FormData();
      submitData.append('file', formData.file);
      submitData.append('nama_lop', formData.nama_lop);
      submitData.append('id_ihld', formData.id_ihld);

      const res = await fetch('/api/boq', {
        method: 'POST',
        body: submitData,
      });

      const response = await res.json();

      if (response.success) {
        showNotification('success', response.message || 'Data BoQ berhasil diimport');
        resetForm();
        fetchData();
        setShowForm(false);
      } else {
        showNotification('error', response.message || 'Gagal import data');
      }
    } catch (error) {
      console.error('Error uploading:', error);
      showNotification('error', 'Gagal upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nama_lop: '',
      id_ihld: '',
      file: null,
    });
    setSearchLop('');
    setShowDropdown(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus data ini?')) return;

    try {
      const res = await fetch(`/api/boq?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification('success', 'Data berhasil dihapus');
        fetchData();
      } else {
        showNotification('error', 'Gagal menghapus data');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      showNotification('error', 'Gagal menghapus data');
    }
  };

  const parseRowCount = (fullData: string): number => {
    try {
      const parsed = JSON.parse(fullData);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  };

  const parseNumber = (value: unknown): number => {
    if (value === undefined || value === null || value === '') return 0;
    if (typeof value === 'number') return value;
    const str = value.toString().trim();
    const cleaned = str.replace(/,/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const formatIdrOrDash = (value: number): string => {
    if (!Number.isFinite(value) || value === 0) return '-';
    return value.toLocaleString('id-ID', { maximumFractionDigits: 0 });
  };

  const parseExcelTableRow = (fullDataArray: unknown[], _rowIndex: number): ExcelTableRow => {
    void _rowIndex;
    const no = (fullDataArray[0] ?? '').toString().trim();
    const designator = (fullDataArray[1] ?? '').toString().trim();
    const deskripsiPekerjaan = (fullDataArray[2] ?? '').toString().trim();
    const satuan = (fullDataArray[3] ?? '').toString().trim();
    const keterangan = (fullDataArray[10] ?? '').toString().trim();
    const materialSatuan = parseNumber(fullDataArray[4]);
    const jasaSatuan = parseNumber(fullDataArray[5]);
    const volume = parseNumber(fullDataArray[6]);
    const totalMaterial = materialSatuan * volume;
    const totalJasa = jasaSatuan * volume;
    const totalHarga = totalMaterial + totalJasa;
    const summaryLabelRegex = /^(MATERIAL|JASA|TOTAL)$/i;
    const summaryFields = [no, designator, deskripsiPekerjaan, satuan];
    const isSummary = summaryFields.some((v) => summaryLabelRegex.test(v.trim()));
    const isSection = !isSummary && !!no && !deskripsiPekerjaan && !satuan;

    return {
      no: no || '-',
      isSection,
      isSummary,
      designator: designator || '-',
      deskripsiPekerjaan: deskripsiPekerjaan || '-',
      satuan: satuan || '-',
      materialSatuan,
      jasaSatuan,
      volume,
      totalMaterial,
      totalJasa,
      totalHarga,
      keterangan: keterangan || '-',
    };
  };

  const parseBoqItemTableRow = (item: ReturnType<typeof normalizeBoqItems>[number]): ExcelTableRow => {
    const isSummary = false;

    return {
      no: item.is_section ? String.fromCharCode(65) : String(item.no || '-'),
      isSection: item.is_section,
      isSummary,
      designator: item.designator || '-',
      deskripsiPekerjaan: item.uraian_pekerjaan || '-',
      satuan: item.satuan || '-',
      materialSatuan: item.harga_satuan_material,
      jasaSatuan: item.harga_satuan_jasa,
      volume: item.volume,
      totalMaterial: item.total_material,
      totalJasa: item.total_jasa,
      totalHarga: item.total,
      keterangan: item.keterangan || '-',
    };
  };

  const parseBoqDetails = (fullDataJson: string, item: BoqData): ParsedBoqDetail[] => {
    try {
      const rawRows = JSON.parse(fullDataJson);
      const detail: ParsedBoqDetail = {
        projectName: item.project_name || item.nama_lop || 'Unknown',
        sto: item.sto || '-',
        tableRows: [],
      };

      const normalizedRows = normalizeBoqItems(rawRows);
      if (normalizedRows.length > 0) {
        detail.tableRows = normalizedRows.map(parseBoqItemTableRow);
      } else if (Array.isArray(rawRows)) {
        rawRows.forEach((row, index) => {
          try {
            if (!row || typeof row !== 'object' || !('full_data' in row)) return;
            const fullDataArray: unknown[] = JSON.parse(String(row.full_data || '[]'));
            const tableRow = parseExcelTableRow(fullDataArray, index);

            if (!tableRow.isSummary) {
              detail.tableRows.push(tableRow);
            }
          } catch (e) {
            console.warn('Failed to parse row:', row, e);
          }
        });
      }

      return [detail];
    } catch (e) {
      console.error('Failed to parse BoQ details:', e);
      return [];
    }
  };

  const handleViewDetails = (item: BoqData) => {
    try {
      const parsedDetails = parseBoqDetails(item.full_data, item);
      setDetailData(parsedDetails);
      setSelectedBoq(item);
    } catch (error) {
      console.error('Error parsing detail data:', error);
      showNotification('error', 'Gagal memuat detail data');
    }
  };

  const handleCloseDetails = () => {
    setSelectedBoq(null);
    setDetailData([]);
  };

  const filteredProjects = projects.filter(p =>
    p.nama_lop.toLowerCase().includes(searchLop.toLowerCase()) ||
    p.id_ihld.toLowerCase().includes(searchLop.toLowerCase())
  );

  const filteredBoqList = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return boqList;
    return boqList.filter((b) =>
      (b.id_ihld || '').toLowerCase().includes(keyword) ||
      (b.nama_lop || '').toLowerCase().includes(keyword) ||
      (b.project_name || '').toLowerCase().includes(keyword)
    );
  }, [boqList, search]);

  // Reset to the first page when the search keyword changes.
  // Adjusting state during render avoids the extra render pass an effect would cause.
  const [prevSearch, setPrevSearch] = useState(search);
  if (search !== prevSearch) {
    setPrevSearch(search);
    setCurrentPage(1);
  }

  const totalPages = Math.ceil(filteredBoqList.length / ITEMS_PER_PAGE);
  const paginatedData = filteredBoqList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const inputClass = "w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow";
  const labelClass = "block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {notification && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in fade-in slide-in-from-right-4 ${notification.type === 'success'
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
          : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
          }`}>
          {notification.message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {showForm ? 'Form Import BoQ' : 'Daftar BoQ Plan'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {showForm ? 'Upload file Excel untuk mengimpor data BoQ' : 'Kelola plan bill of quantity project'}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); resetForm(); }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={18} />
            <span>Tambah</span>
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText size={18} className="text-blue-600" />
              Import Data BoQ
            </h3>
            <button
              onClick={() => { setShowForm(false); resetForm(); }}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <label className={labelClass}>Nama LOP <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type="text"
                    value={showDropdown ? searchLop : formData.nama_lop}
                    onChange={(e) => {
                      setSearchLop(e.target.value);
                      setShowDropdown(true);
                      if (!e.target.value) {
                        setFormData({ ...formData, nama_lop: '', id_ihld: '' });
                      }
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    required
                    className={inputClass}
                    placeholder="Cari Nama LOP..."
                    autoComplete="off"
                  />
                  <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </div>

                {showDropdown && filteredProjects.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredProjects.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectLop(p)}
                        className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">{p.nama_lop}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{p.id_ihld}</div>
                      </button>
                    ))}
                  </div>
                )}
                {showDropdown && searchLop && filteredProjects.length === 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm text-gray-500 dark:text-gray-400">
                    Tidak ada hasil
                  </div>
                )}
              </div>
              <div>
                <label className={labelClass}>ID IHLD <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.id_ihld}
                  readOnly
                  className={`${inputClass} bg-gray-50 dark:bg-gray-900/50 cursor-not-allowed`}
                  placeholder="Akan terisi otomatis"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>File Excel <span className="text-red-500">*</span></label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileChange(e.dataTransfer.files[0]); }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${isDragging
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
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
                <div className="flex flex-col items-center gap-2">
                  <Upload size={24} className={formData.file ? "text-emerald-500" : "text-gray-400"} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {formData.file ? formData.file.name : "Klik atau drag file Excel ke sini"}
                  </span>
                  <span className="text-xs text-gray-500">Format: .xlsx atau .xls</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isUploading || !formData.nama_lop || !formData.file}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isUploading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                <span>Simpan</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {boqList.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {filteredBoqList.length} dari {boqList.length} data
          </p>
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari ID IHLD atau Nama LOP..."
              className="w-full h-10 pl-9 pr-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {paginatedData.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th scope="col" className="px-3 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID IHLD / Nama LOP</th>
                    <th scope="col" className="px-3 py-3 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Data Rows</th>
                    <th scope="col" className="px-3 py-3 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Tanggal</th>
                    <th scope="col" className="px-3 py-3 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-3 py-3">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[150px] sm:max-w-[200px]">
                          {item.id_ihld || '-'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px] sm:max-w-[200px]">
                          {item.project_name || item.nama_lop}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-gray-600 dark:text-gray-300 hidden sm:table-cell">
                        <span className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                          {parseRowCount(item.full_data)} rows
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-gray-600 dark:text-gray-300 hidden md:table-cell">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleViewDetails(item)}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                            title="Lihat Detail"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="bg-white dark:bg-gray-900 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Halaman <span className="font-medium text-gray-900 dark:text-white">{currentPage}</span> dari <span className="font-medium text-gray-900 dark:text-white">{totalPages}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="px-6 py-12 text-center">
            <FileText size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {showForm ? 'Simpan data untuk melihat di daftar' : 'Belum ada data BoQ. Klik "Tambah" untuk memulai.'}
            </p>
          </div>
        )}
      </div>

      {selectedBoq && detailData.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleCloseDetails}></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedBoq.project_name || selectedBoq.nama_lop}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Total {detailData.reduce((sum, d) => sum + d.tableRows.length, 0)} Data Rows
                </p>
              </div>
              <button
                onClick={handleCloseDetails}
                className="p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-white/50 dark:hover:bg-gray-700 transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="overflow-hidden flex flex-col max-h-[calc(95vh-140px)]">
              <div className="overflow-auto flex-1 p-6">
                <div className="space-y-6">
                  {detailData.map((detail, detailIndex) => (
                    <div key={detailIndex} className="bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200/50 dark:border-gray-700/50">
                        <div className="w-2 h-8 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-full"></div>
                        <div>
                          <h4 className="text-lg font-bold text-gray-900 dark:text-white">{selectedBoq.nama_lop}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">ID IHLD: {selectedBoq.id_ihld}</p>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                        <table className="w-full border-collapse">
                          <thead className="sticky top-0 z-10">
                            <tr className="bg-yellow-400 dark:bg-yellow-500">
                              <th rowSpan={2} className="px-3 py-2 text-center text-xs font-bold text-gray-900 uppercase tracking-wider border border-gray-400 align-middle">NO</th>
                              <th rowSpan={2} className="px-4 py-2 text-center text-xs font-bold text-gray-900 uppercase tracking-wider border border-gray-400 align-middle">DESIGNATOR</th>
                              <th rowSpan={2} className="px-4 py-2 text-center text-xs font-bold text-gray-900 uppercase tracking-wider border border-gray-400 align-middle">URAIAN PEKERJAAN</th>
                              <th rowSpan={2} className="px-3 py-2 text-center text-xs font-bold text-gray-900 uppercase tracking-wider border border-gray-400 align-middle">SATUAN</th>
                              <th colSpan={2} className="px-4 py-2 text-center text-xs font-bold text-gray-900 uppercase tracking-wider border border-gray-400">HARGA SATUAN (PAKET-2)</th>
                              <th rowSpan={2} className="px-3 py-2 text-center text-xs font-bold text-gray-900 uppercase tracking-wider border border-gray-400 align-middle">VOL</th>
                              <th colSpan={3} className="px-4 py-2 text-center text-xs font-bold text-gray-900 uppercase tracking-wider border border-gray-400">TOTAL HARGA (Rp.)</th>
                              <th rowSpan={2} className="px-4 py-2 text-center text-xs font-bold text-gray-900 uppercase tracking-wider border border-gray-400 align-middle">KETERANGAN</th>
                            </tr>
                            <tr className="bg-yellow-400 dark:bg-yellow-500">
                              <th className="px-4 py-2 text-center text-xs font-bold text-gray-900 uppercase tracking-wider border border-gray-400">MATERIAL</th>
                              <th className="px-4 py-2 text-center text-xs font-bold text-gray-900 uppercase tracking-wider border border-gray-400">JASA</th>
                              <th className="px-4 py-2 text-center text-xs font-bold text-gray-900 uppercase tracking-wider border border-gray-400">MATERIAL</th>
                              <th className="px-4 py-2 text-center text-xs font-bold text-gray-900 uppercase tracking-wider border border-gray-400">JASA</th>
                              <th className="px-4 py-2 text-center text-xs font-bold text-gray-900 uppercase tracking-wider border border-gray-400">TOTAL</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800">
                            {detail.tableRows.map((row, rowIndex) => {
                              if (row.isSection) {
                                return (
                                  <tr key={rowIndex} className="bg-red-500 dark:bg-red-600">
                                    <td className="px-3 py-2 text-sm font-bold text-white text-center border border-gray-400">
                                      {row.no}
                                    </td>
                                    <td colSpan={10} className="px-4 py-2 text-sm font-bold text-white border border-gray-400">
                                      {row.designator !== '-' ? row.designator : ''}
                                    </td>
                                  </tr>
                                );
                              }

                              return (
                                <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                  <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white text-center border border-gray-300 dark:border-gray-600">
                                    {row.no}
                                  </td>
                                  <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">
                                    {row.designator}
                                  </td>
                                  <td 
                                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 max-w-[320px] whitespace-normal"
                                    title={row.deskripsiPekerjaan}
                                  >
                                    <div className="line-clamp-3">
                                      {row.deskripsiPekerjaan}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 text-center border border-gray-300 dark:border-gray-600">
                                    {row.satuan}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 text-right border border-gray-300 dark:border-gray-600 tabular-nums">
                                    {formatIdrOrDash(row.materialSatuan)}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 text-right border border-gray-300 dark:border-gray-600 tabular-nums">
                                    {formatIdrOrDash(row.jasaSatuan)}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white text-center border border-gray-300 dark:border-gray-600 tabular-nums">
                                    {row.volume > 0 ? row.volume.toLocaleString('id-ID') : '-'}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 text-right border border-gray-300 dark:border-gray-600 tabular-nums bg-red-50/40 dark:bg-red-900/10">
                                    {formatIdrOrDash(row.totalMaterial)}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 text-right border border-gray-300 dark:border-gray-600 tabular-nums bg-blue-50/40 dark:bg-blue-900/10">
                                    {formatIdrOrDash(row.totalJasa)}
                                  </td>
                                  <td className="px-4 py-2 text-sm font-bold text-gray-900 dark:text-white text-right border border-gray-300 dark:border-gray-600 tabular-nums bg-yellow-50/50 dark:bg-yellow-900/20">
                                    {formatIdrOrDash(row.totalHarga)}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600">
                                    {row.keterangan === '-' ? '' : row.keterangan}
                                  </td>
                                </tr>
                              );
                            })}

                            {(() => {
                              const grandTotalMaterial = detail.tableRows.reduce((sum, r) => sum + r.totalMaterial, 0);
                              const grandTotalJasa = detail.tableRows.reduce((sum, r) => sum + r.totalJasa, 0);
                              const grandTotalAll = detail.tableRows.reduce((sum, r) => sum + r.totalHarga, 0);

                              return (
                                <>
                                  <tr className="bg-gray-100 dark:bg-gray-700/60">
                                    <td colSpan={6} className="px-4 py-2 text-sm text-right font-bold border border-gray-400 text-gray-900 dark:text-white uppercase tracking-wider">MATERIAL</td>
                                    <td className="px-4 py-2 text-sm text-right font-bold border border-gray-400 tabular-nums text-gray-900 dark:text-white">{formatIdrOrDash(grandTotalMaterial)}</td>
                                    <td className="px-4 py-2 border border-gray-400 bg-red-50/60 dark:bg-red-900/20"></td>
                                    <td className="px-4 py-2 border border-gray-400 bg-blue-50/60 dark:bg-blue-900/20"></td>
                                    <td className="px-4 py-2 text-sm text-right font-bold border border-gray-400 tabular-nums text-gray-900 dark:text-white bg-yellow-50/60 dark:bg-yellow-900/20">{formatIdrOrDash(grandTotalMaterial)}</td>
                                    <td className="border border-gray-400"></td>
                                  </tr>
                                  <tr className="bg-gray-100 dark:bg-gray-700/60">
                                    <td colSpan={6} className="px-4 py-2 text-sm text-right font-bold border border-gray-400 text-gray-900 dark:text-white uppercase tracking-wider">JASA</td>
                                    <td className="px-4 py-2 text-sm text-right font-bold border border-gray-400 tabular-nums text-gray-900 dark:text-white">{formatIdrOrDash(grandTotalJasa)}</td>
                                    <td className="px-4 py-2 border border-gray-400 bg-red-50/60 dark:bg-red-900/20"></td>
                                    <td className="px-4 py-2 border border-gray-400 bg-blue-50/60 dark:bg-blue-900/20"></td>
                                    <td className="px-4 py-2 text-sm text-right font-bold border border-gray-400 tabular-nums text-gray-900 dark:text-white bg-yellow-50/60 dark:bg-yellow-900/20">{formatIdrOrDash(grandTotalJasa)}</td>
                                    <td className="border border-gray-400"></td>
                                  </tr>
                                  <tr className="bg-gray-100 dark:bg-gray-700/60">
                                    <td colSpan={6} className="px-4 py-2 text-sm text-right font-bold border border-gray-400 text-gray-900 dark:text-white uppercase tracking-wider">TOTAL</td>
                                    <td className="px-4 py-2 text-sm text-right font-bold border border-gray-400 tabular-nums text-gray-900 dark:text-white">{formatIdrOrDash(grandTotalAll)}</td>
                                    <td className="px-4 py-2 border border-gray-400 bg-red-50/60 dark:bg-red-900/20"></td>
                                    <td className="px-4 py-2 border border-gray-400 bg-blue-50/60 dark:bg-blue-900/20"></td>
                                    <td className="px-4 py-2 text-sm text-right font-bold border border-gray-400 tabular-nums text-gray-900 dark:text-white bg-yellow-50/60 dark:bg-yellow-900/20">{formatIdrOrDash(grandTotalAll)}</td>
                                    <td className="border border-gray-400"></td>
                                  </tr>
                                </>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-1.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total {detailData.reduce((sum, d) => sum + d.tableRows.length, 0)} baris data
                </p>
                <button
                  onClick={handleCloseDetails}
                  className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all font-medium shadow-lg hover:shadow-xl"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
