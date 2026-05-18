// Page for managing Aanwijzing (technical briefing) data
'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Save, Trash2, Edit3, Plus, X, FileText, ChevronLeft, ChevronRight, Upload, Loader2, Eye } from 'lucide-react';
import BoqPreviewTable from '@/components/features/boq/BoqPreviewTable';

interface ProjectOption {
  nama_lop: string;
  id_ihld: string;
}

interface AanwijzingData {
  id: string;
  nama_lop: string;
  id_ihld: string;
  tematik: string;
  tanggal_aanwijzing: string;
  catatan: string;
  status_after_aanwijzing: string;
  gpon: string;
  frame: number;
  slot_awal: number;
  slot_akhir: number;
  port_awal: number;
  port_akhir: number;
  wa_spang: string;
  ut: string;
  boq_data?: {
    full_data: string;
  } | null;
  created_at: string;
}

const ITEMS_PER_PAGE = 5;

export default function AanwijzingPage() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [aanwijzingList, setAanwijzingList] = useState<AanwijzingData[]>([]);
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
    tematik: '',
    tanggal_aanwijzing: '',
    catatan: '',
    status_after_aanwijzing: '',
    gpon: '',
    frame: '',
    slot_awal: '',
    slot_akhir: '',
    port_awal: '',
    port_akhir: '',
    wa_spang: '',
    ut: '',
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
      const res = await fetch('/api/aanwijzing');
      const response = await res.json();
      if (response.success) {
        setProjects(response.data.projects || []);
        setAanwijzingList(response.data.aanwijzing || []);
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
        showNotification('success', response.message || 'File BoQ berhasil diuraikan');
      } else {
        showNotification('error', response.message || 'Gagal menguraikan file');
      }
    } catch (error) {
      console.error('Error uploading BoQ:', error);
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
      const res = await fetch('/api/aanwijzing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          frame: Number(formData.frame) || 0,
          slot_awal: Number(formData.slot_awal) || 0,
          slot_akhir: Number(formData.slot_akhir) || 0,
          port_awal: Number(formData.port_awal) || 0,
          port_akhir: Number(formData.port_akhir) || 0,
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

  const handleEdit = (item: AanwijzingData) => {
    setFormData({
      nama_lop: item.nama_lop,
      id_ihld: item.id_ihld,
      tematik: item.tematik || '',
      tanggal_aanwijzing: item.tanggal_aanwijzing || '',
      catatan: item.catatan || '',
      status_after_aanwijzing: item.status_after_aanwijzing || '',
      gpon: item.gpon || '',
      frame: String(item.frame || ''),
      slot_awal: String(item.slot_awal || ''),
      slot_akhir: String(item.slot_akhir || ''),
      port_awal: String(item.port_awal || ''),
      port_akhir: String(item.port_akhir || ''),
      wa_spang: item.wa_spang || '',
      ut: item.ut || '',
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
      const res = await fetch(`/api/aanwijzing?id=${id}`, { method: 'DELETE' });
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
      tematik: '',
      tanggal_aanwijzing: '',
      catatan: '',
      status_after_aanwijzing: '',
      gpon: '',
      frame: '',
      slot_awal: '',
      slot_akhir: '',
      port_awal: '',
      port_akhir: '',
      wa_spang: '',
      ut: '',
    });
    setBoqRows([]);
    setSearchLop('');
    setShowDropdown(false);
    setEditingId(null);
  };

  const totalPages = Math.ceil(aanwijzingList.length / ITEMS_PER_PAGE);
  const paginatedData = aanwijzingList.slice(
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
            {editingId ? 'Edit Catatan AANWIJZING' : showForm ? 'Form Catatan AANWIJZING' : 'Daftar Catatan AANWIJZING'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {showForm ? 'Isi form berikut untuk menyimpan data aanwijzing' : 'Kelola catatan aanwijzing project'}
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
              {editingId ? 'Edit Data' : 'Input Data AANWIJZING'}
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
                <label className={labelClass}>Tanggal AANWIJZING <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={formData.tanggal_aanwijzing}
                  onChange={(e) => setFormData({ ...formData, tanggal_aanwijzing: e.target.value })}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Tematik</label>
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
                <label className={labelClass}>Status After Aanwijzing</label>
                <input
                  type="text"
                  value={formData.status_after_aanwijzing}
                  onChange={(e) => setFormData({ ...formData, status_after_aanwijzing: e.target.value })}
                  className={inputClass}
                  placeholder="Masukkan STATUS..."
                />
              </div>
              <div>
                <label className={labelClass}>GPON</label>
                <input
                  type="text"
                  value={formData.gpon}
                  onChange={(e) => setFormData({ ...formData, gpon: e.target.value })}
                  className={inputClass}
                  placeholder="Masukkan GPON..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Frame</label>
                <input
                  type="number"
                  value={formData.frame}
                  onChange={(e) => setFormData({ ...formData, frame: e.target.value })}
                  className={inputClass}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className={labelClass}>Slot Awal</label>
                <input
                  type="number"
                  value={formData.slot_awal}
                  onChange={(e) => setFormData({ ...formData, slot_awal: e.target.value })}
                  className={inputClass}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className={labelClass}>Slot Akhir</label>
                <input
                  type="number"
                  value={formData.slot_akhir}
                  onChange={(e) => setFormData({ ...formData, slot_akhir: e.target.value })}
                  className={inputClass}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>WA SPANG</label>
                <input
                  type="text"
                  value={formData.wa_spang}
                  onChange={(e) => setFormData({ ...formData, wa_spang: e.target.value })}
                  className={inputClass}
                  placeholder="Masukkan WA SPANG..."
                />
              </div>
              <div>
                <label className={labelClass}>Port Awal</label>
                <input
                  type="number"
                  value={formData.port_awal}
                  onChange={(e) => setFormData({ ...formData, port_awal: e.target.value })}
                  className={inputClass}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className={labelClass}>Port Akhir</label>
                <input
                  type="number"
                  value={formData.port_akhir}
                  onChange={(e) => setFormData({ ...formData, port_akhir: e.target.value })}
                  className={inputClass}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>UT</label>
              <input
                type="text"
                value={formData.ut}
                onChange={(e) => setFormData({ ...formData, ut: e.target.value })}
                className={inputClass}
                placeholder="Masukkan UT..."
              />
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className={labelClass}>BoQ-AANWIJZING</label>
                  <p className="text-[10px] text-gray-500 lowercase">Upload file BoQ hasil Aanwijzing (.xlsx atau .xls)</p>
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
                        {boqRows.length > 0 ? 'Ganti File' : 'Upload BoQ'}
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
              <label className={labelClass}>Catatan</label>
              <textarea
                value={formData.catatan}
                onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                className={`${inputClass} min-h-[120px] resize-y`}
                placeholder="1. Catatan pertama&#10;2. Catatan kedua&#10;3. Catatan ketiga..."
              />
              <p className="text-[10px] text-gray-400 mt-1">Gunakan format: 1. ... 2. ... 3. ...</p>
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
                    <th scope="col" className="px-3 py-3 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Tgl AANWIJZING</th>
                    <th scope="col" className="px-3 py-3 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">UT</th>
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
                        {item.tanggal_aanwijzing ? new Date(item.tanggal_aanwijzing).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-gray-600 dark:text-gray-300 hidden lg:table-cell">
                        {item.ut || '-'}
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
              {showForm ? 'Simpan data untuk melihat di daftar' : 'Belum ada data aanwijzing. Klik "Tambah" untuk memulai.'}
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
                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">PREVIEW <span className="text-blue-600">BoQ-AANWIJZING</span></h3>
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
