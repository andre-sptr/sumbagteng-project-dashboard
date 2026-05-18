// User Testing (UT) data entry and management page
'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Save, Trash2, Edit3, Plus, X, FileText, ChevronLeft, ChevronRight, Upload, Loader2, Eye } from 'lucide-react';
import BoqPreviewTable from '@/components/features/boq/BoqPreviewTable';

interface ProjectOption {
  nama_lop: string;
  id_ihld: string;
}

interface UTData {
  id: string;
  nama_lop: string;
  id_ihld: string;
  witel: string;
  tematik: string;
  sto: string;
  tim_ut: string;
  commtest_ut: string;
  jumlah_odp: number;
  jumlah_port: number;
  tanggal_ct_ut: string;
  temuan: string;
  mitra: string;
  jumlah_temuan: number;
  wa_spang: string;
  komitmen_penyelesaian: string;
  boq_data?: {
    full_data: string;
  } | null;
  created_at: string;
}

const ITEMS_PER_PAGE = 5;

const COMMTEST_UT_OPTIONS = [
  { value: 'COMMTEST', label: 'COMMTEST' },
  { value: 'UT', label: 'UT' },
];

export default function UTPage() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [utList, setUtList] = useState<UTData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [boqRows, setBoqRows] = useState<unknown[]>([]);
  const [isUploadingBoq, setIsUploadingBoq] = useState(false);
  const [showBoqPreview, setShowBoqPreview] = useState(false);

  const [formData, setFormData] = useState({
    nama_lop: '',
    id_ihld: '',
    witel: '',
    tematik: '',
    sto: '',
    tim_ut: '',
    commtest_ut: '',
    jumlah_odp: '',
    jumlah_port: '',
    tanggal_ct_ut: '',
    temuan: '',
    mitra: '',
    jumlah_temuan: '',
    wa_spang: '',
    komitmen_penyelesaian: '',
  });

  const [searchLop, setSearchLop] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredProjects = projects.filter(p =>
    p.nama_lop.toLowerCase().includes(searchLop.toLowerCase()) ||
    p.id_ihld.toLowerCase().includes(searchLop.toLowerCase())
  );

  const handleSelectLop = (project: ProjectOption) => {
    setFormData({
      ...formData,
      nama_lop: project.nama_lop,
      id_ihld: project.id_ihld,
    });
    setSearchLop(project.nama_lop);
    setShowDropdown(false);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchData = React.useCallback(async () => {
    try {
      const res = await fetch('/api/ut');
      const response = await res.json();
      if (response.success) {
        setProjects(response.data.projects || []);
        setUtList(response.data.ut || []);
      } else {
        showNotification('error', response.message || 'Gagal mengambil data');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification('error', 'Gagal mengambil data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (mounted) await fetchData();
    };
    load();
    return () => { mounted = false; };
  }, [fetchData]);

  const handleTemuanChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, temuan: value });

    const temuanMatches = value.match(/^\d+\./gm);
    const count = temuanMatches ? temuanMatches.length : 0;
    if (count > 0) {
      setFormData(prev => ({ ...prev, temuan: value, jumlah_temuan: String(count) }));
    } else {
      setFormData(prev => ({ ...prev, temuan: value, jumlah_temuan: '' }));
    }
  };

  const handleBoqUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBoq(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const res = await fetch('/api/boq/parse', {
        method: 'POST',
        body: formDataUpload,
      });

      const response = await res.json();

      if (response.success) {
        setBoqRows(response.data);
        showNotification('success', response.message || 'File BoQ UT berhasil diuraikan');
      } else {
        showNotification('error', response.message || 'Gagal menguraikan file');
      }
    } catch (error) {
      console.error('Error uploading BoQ UT:', error);
      showNotification('error', 'Terjadi kesalahan saat upload');
    } finally {
      setIsUploadingBoq(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/ut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          jumlah_odp: Number(formData.jumlah_odp) || 0,
          jumlah_port: Number(formData.jumlah_port) || 0,
          jumlah_temuan: Number(formData.jumlah_temuan) || 0,
          boq_data: boqRows.length > 0 ? boqRows : null,
          id: editingId ?? undefined,
        }),
      });

      const response = await res.json();

      if (response.success) {
        showNotification('success', response.message || (editingId ? 'Data berhasil diperbarui' : 'Data berhasil disimpan'));
        resetForm();
        fetchData();
        setShowForm(false);
        setEditingId(null);
      } else {
        showNotification('error', response.message || 'Gagal menyimpan data');
      }
    } catch (error) {
      console.error('Error saving:', error);
      showNotification('error', 'Gagal menyimpan data');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: UTData) => {
    setFormData({
      nama_lop: item.nama_lop,
      id_ihld: item.id_ihld,
      witel: item.witel || '',
      tematik: item.tematik || '',
      sto: item.sto || '',
      tim_ut: item.tim_ut || '',
      commtest_ut: item.commtest_ut || '',
      jumlah_odp: String(item.jumlah_odp || ''),
      jumlah_port: String(item.jumlah_port || ''),
      tanggal_ct_ut: item.tanggal_ct_ut || '',
      temuan: item.temuan || '',
      mitra: item.mitra || '',
      jumlah_temuan: String(item.jumlah_temuan || ''),
      wa_spang: item.wa_spang || '',
      komitmen_penyelesaian: item.komitmen_penyelesaian || '',
    });
    setSearchLop(item.nama_lop);
    setEditingId(item.id);
    if (item.boq_data && item.boq_data.full_data) {
      try {
        setBoqRows(JSON.parse(item.boq_data.full_data));
      } catch (e) {
        console.error('Error parsing boq_data:', e);
        setBoqRows([]);
      }
    } else {
      setBoqRows([]);
    }
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus data ini?')) return;

    try {
      const res = await fetch(`/api/ut?id=${id}`, { method: 'DELETE' });
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

  const resetForm = () => {
    setFormData({
      nama_lop: '',
      id_ihld: '',
      witel: '',
      tematik: '',
      sto: '',
      tim_ut: '',
      commtest_ut: '',
      jumlah_odp: '',
      jumlah_port: '',
      tanggal_ct_ut: '',
      temuan: '',
      mitra: '',
      jumlah_temuan: '',
      wa_spang: '',
      komitmen_penyelesaian: '',
    });
    setBoqRows([]);
    setSearchLop('');
    setShowDropdown(false);
    setEditingId(null);
  };

  const totalPages = Math.ceil(utList.length / ITEMS_PER_PAGE);
  const paginatedData = utList.slice(
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
            {editingId ? 'Edit Rekap UT' : showForm ? 'Form Rekap UT' : 'Daftar Rekap UT'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {showForm ? 'Isi form berikut untuk menyimpan data UT' : 'Kelola data hasil UT (Uji Terima)'}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); resetForm(); setEditingId(null); }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={18} />
            <span className="sm:hidden">Tambah</span>
            <span className="hidden sm:inline">Tambah</span>
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText size={18} className="text-blue-600" />
              {editingId ? 'Edit Data' : 'Input Data Rekap UT'}
            </h3>
            <button
              onClick={() => { setShowForm(false); resetForm(); setEditingId(null); }}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>WITEL</label>
                <input
                  type="text"
                  value={formData.witel}
                  onChange={(e) => setFormData({ ...formData, witel: e.target.value })}
                  className={inputClass}
                  placeholder="Masukkan WITEL..."
                />
              </div>
              <div>
                <label className={labelClass}>TEMATIK</label>
                <input
                  type="text"
                  value={formData.tematik}
                  onChange={(e) => setFormData({ ...formData, tematik: e.target.value })}
                  className={inputClass}
                  placeholder="Masukkan TEMATIK..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>STO</label>
                <input
                  type="text"
                  value={formData.sto}
                  onChange={(e) => setFormData({ ...formData, sto: e.target.value })}
                  className={inputClass}
                  placeholder="Masukkan STO..."
                />
              </div>
              <div>
                <label className={labelClass}>TIM UT</label>
                <input
                  type="text"
                  value={formData.tim_ut}
                  onChange={(e) => setFormData({ ...formData, tim_ut: e.target.value })}
                  className={inputClass}
                  placeholder="Masukkan TIM UT..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>COMMTEST/UT</label>
                <select
                  value={formData.commtest_ut}
                  onChange={(e) => setFormData({ ...formData, commtest_ut: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Pilih...</option>
                  {COMMTEST_UT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Tanggal CT/UT <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={formData.tanggal_ct_ut}
                  onChange={(e) => setFormData({ ...formData, tanggal_ct_ut: e.target.value })}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>JUMLAH ODP</label>
                <input
                  type="number"
                  value={formData.jumlah_odp}
                  onChange={(e) => setFormData({ ...formData, jumlah_odp: e.target.value })}
                  className={inputClass}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className={labelClass}>JUMLAH PORT</label>
                <input
                  type="number"
                  value={formData.jumlah_port}
                  onChange={(e) => setFormData({ ...formData, jumlah_port: e.target.value })}
                  className={inputClass}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Temuan</label>
              <textarea
                value={formData.temuan}
                onChange={handleTemuanChange}
                className={`${inputClass} min-h-[120px] resize-y`}
                placeholder="1. Temuan pertama&#10;2. Temuan kedua&#10;3. Temuan ketiga..."
              />
              <p className="text-[10px] text-gray-400 mt-1">Gunakan format: 1. ... 2. ... 3. ...</p>
            </div>

            <div>
              <label className={labelClass}>Mitra</label>
              <input
                type="text"
                value={formData.mitra}
                onChange={(e) => setFormData({ ...formData, mitra: e.target.value })}
                className={inputClass}
                placeholder="Masukkan MITRA..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Jumlah Temuan</label>
                <input
                  type="number"
                  value={formData.jumlah_temuan}
                  onChange={(e) => setFormData({ ...formData, jumlah_temuan: e.target.value })}
                  className={inputClass}
                  placeholder="0"
                  min="0"
                />
                <p className="text-[10px] text-gray-400 mt-1">Otomatis terisi dari Temuan</p>
              </div>
              <div>
                <label className={labelClass}>WA SPANG TA</label>
                <input
                  type="text"
                  value={formData.wa_spang}
                  onChange={(e) => setFormData({ ...formData, wa_spang: e.target.value })}
                  className={inputClass}
                  placeholder="Masukkan WA SPANG TA..."
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className={labelClass}>BoQ-UT</label>
                  <p className="text-[10px] text-gray-500 lowercase">Upload file BoQ hasil UT (.xlsx atau .xls)</p>
                </div>
                <div className="flex items-center gap-2">
                  {boqRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowBoqPreview(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs font-bold rounded-lg border border-indigo-100 dark:border-indigo-800 transition-colors"
                    >
                      <Eye size={14} />
                      Lihat Data ({boqRows.length})
                    </button>
                  )}
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    {isUploadingBoq ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Menguraikan...
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        {boqRows.length > 0 ? 'Ganti File' : 'Upload BoQ UT'}
                      </>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept=".xlsx, .xls"
                      onChange={handleBoqUpload}
                      disabled={isUploadingBoq}
                    />
                  </label>
                  {boqRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setBoqRows([])}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Hapus BoQ"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Komitment penyelesaian</label>
              <input
                type="date"
                value={formData.komitmen_penyelesaian}
                onChange={(e) => setFormData({ ...formData, komitmen_penyelesaian: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); setEditingId(null); }}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {editingId ? 'Perbarui' : 'Simpan'}
              </button>
            </div>
          </form>
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
                    <th scope="col" className="px-3 py-3 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Tgl CT/UT</th>
                    <th scope="col" className="px-3 py-3 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">COMMTEST/UT</th>
                    <th scope="col" className="px-3 py-3 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[150px] sm:max-w-[200px]">
                            {item.id_ihld}
                          </div>
                          {item.boq_data && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 text-[10px] font-black rounded-md border border-indigo-200 dark:border-indigo-800" title="BoQ Attached">
                              <FileText size={10} />
                              BOQ
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px] sm:max-w-[200px]">
                          {item.nama_lop}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-gray-600 dark:text-gray-300 hidden md:table-cell">
                        {item.tanggal_ct_ut ? new Date(item.tanggal_ct_ut).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-gray-600 dark:text-gray-300 hidden lg:table-cell">
                        {item.commtest_ut || '-'}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                            title="Edit"
                          >
                            <Edit3 size={16} />
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
              {showForm ? 'Simpan data untuk melihat di daftar' : 'Belum ada data UT. Klik "Tambah" untuk memulai.'}
            </p>
          </div>
        )}
      </div>

      {showBoqPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBoqPreview(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">PREVIEW <span className="text-blue-600">BoQ-UT</span></h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{boqRows.length} Baris Data Ditemukan</p>
              </div>
              <button
                onClick={() => setShowBoqPreview(false)}
                className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <BoqPreviewTable rows={boqRows} />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end">
              <button
                onClick={() => setShowBoqPreview(false)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
