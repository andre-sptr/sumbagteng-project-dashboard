// Expandable table row for individual project data
import React from 'react';
import { ChevronDown, ChevronUp, FileText, Activity, Database } from 'lucide-react';
import type { Project } from '@/types/database';
import { HistoryEntry, formatDuration } from '@/utils/duration';
import { formatExcelDate, getFullDataArray } from '@/utils/project';
import { parseJsonArray } from '@/utils/json';
import { DurationCounter } from './DurationCounter';
import DocumentManager from '../documents/DocumentManager';

interface Props {
  project: Project;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  getStatusColor: (status: string) => string;
}

export const RAW_DATA_HEADERS = [
  'TAHUN', 'ID-IHLD', 'NAMA LOP', 'REGIONAL', 'AREA', 'STO', 'REGION FMC', 'BRANCH FMC',
  'BATCH PROGRAM', 'ODP PLAN', 'PORT PLAN', 'CPP', 'BOQ', 'Mitra', 'Status', 'SUB STATUS KONS',
  'DETAIL STATUS', 'KET Ba Drop', 'KOMITMEN GOLIVE', 'TARGET GOLIVE APRIL', 'Prioritas 1 by Tsel', 'PID (PROACTIVE)', 'WASPANG', 'PROJECT ADMIN',
  'STATUS GOLIVE', 'KENDALA GOLIVE', 'Progres MINOL', 'REAL JML ODP 8', 'REAL JML ODP 16', 'ID SW ABD', 'REAL JML PORT GOLIVE', 'TANGGAL GOLIVE'
];

const DATE_COLUMN_INDICES = new Set([18, 19, 31]);
const NUMBER_COLUMN_INDICES = new Set([12]);

export const ProjectRow = ({ project, index, isExpanded, onToggle, getStatusColor }: Props) => {
  const parsedHistory = parseJsonArray<HistoryEntry>(project.history || '[]');
  const fullData = getFullDataArray(project);

  const displayTanggalGolive = formatExcelDate(fullData[31]);
  const staggerClass = index < 10 ? `stagger-${(index % 4) + 1}` : '';

  return (
    <React.Fragment>
      <tr
        className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer animate-in ${staggerClass} ${isExpanded ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
        onClick={onToggle}
      >
        <td className="px-6 py-4">
          <div className="text-sm font-bold text-gray-900 dark:text-white">{project.id_ihld}</div>
          {project.batch_program && (
            <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5 uppercase tracking-wide">
              {project.batch_program}
            </div>
          )}
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate max-w-xs" title={project.nama_lop}>
            {project.nama_lop || '-'}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-center">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
            {project.status || '-'}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-700 dark:text-gray-300">
          {project.sub_status || '-'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-center">
          {displayTanggalGolive !== '-' ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              {displayTanggalGolive}
            </span>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-600">-</span>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-center">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            <DurationCounter lastChangedAt={project.last_changed_at} />
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
          <button
            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} className="px-0 py-0 bg-gray-50/50 dark:bg-gray-800/30">
            <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-200">
              <ProjectDetailTabs project={project} fullData={fullData} parsedHistory={parsedHistory} />
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};

type ProjectDetailTab = 'info' | 'history' | 'documents';

const ProjectDetailTabs = ({ project, fullData, parsedHistory }: { project: Project, fullData: unknown[], parsedHistory: HistoryEntry[] }) => {
  const [activeTab, setActiveTab] = React.useState<'info' | 'history' | 'documents'>('info');

  const tabs: { id: ProjectDetailTab; label: string; icon: React.ReactNode }[] = [
    { id: 'info', label: 'Informasi Proyek', icon: <Database size={16} /> },
    { id: 'history', label: 'Riwayat Status', icon: <Activity size={16} /> },
    { id: 'documents', label: 'Dokumen', icon: <FileText size={16} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-120">
        {activeTab === 'info' && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 animate-in fade-in duration-300">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Database size={16} className="text-purple-500" />
              Data Kolom Mentah (Raw)
            </h4>
            <div className="max-h-104 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-xs">
                {RAW_DATA_HEADERS.map((headerName, idx) => {
                  const val = fullData[idx];
                  const isEmpty = val === null || val === undefined || val === '' || String(val).trim() === '#N/A';
                  const displayVal = DATE_COLUMN_INDICES.has(idx)
                    ? formatExcelDate(val)
                    : NUMBER_COLUMN_INDICES.has(idx)
                      ? isEmpty ? '-' : (isNaN(Number(val)) ? String(val) : Number(val).toLocaleString('en-US'))
                      : isEmpty ? '-' : String(val);
                  const isGolive = idx === 31;
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col border-b pb-1.5 ${isGolive
                        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded'
                        : 'border-gray-50 dark:border-gray-700/50'
                        }`}
                    >
                      <span className={`font-semibold text-[10px] tracking-wider uppercase mb-0.5 ${isGolive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'
                        }`}>
                        {headerName}
                      </span>
                      <span
                        className={`font-medium ${isGolive
                          ? 'text-emerald-800 dark:text-emerald-300'
                          : 'text-gray-800 dark:text-gray-300'
                          }`}
                        title={String(displayVal)}
                      >
                        {displayVal}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Activity size={16} className="text-blue-500" />
                Riwayat Perubahan Status
              </h4>
              <div className="max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {(() => {
                  const statusGroups = parsedHistory.reduce<{ status: string; duration_minutes: number; ended_at: string }[]>((acc, h) => {
                    const last = acc[acc.length - 1];
                    if (last && last.status === h.status) {
                      last.duration_minutes += h.duration_minutes;
                      last.ended_at = h.ended_at;
                    } else {
                      acc.push({ status: h.status, duration_minutes: h.duration_minutes, ended_at: h.ended_at });
                    }
                    return acc;
                  }, []);

                  const hasRealStatusChange = statusGroups.some(
                    (g) => g.status !== project.status
                  );

                  return hasRealStatusChange ? (
                    <ul className="space-y-3">
                      {statusGroups.map((h, i) => (
                        <li key={i} className="flex flex-col text-sm border-b border-gray-50 dark:border-gray-700/50 pb-3 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-gray-800 dark:text-gray-200">{h.status}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                              {formatDuration(h.duration_minutes)}
                            </span>
                          </div>
                          {h.ended_at && (
                            <span className="text-gray-400 dark:text-gray-500 text-[10px] mt-1">
                              Selesai pada: {new Date(h.ended_at.includes('T') ? h.ended_at : h.ended_at.replace(' ', 'T') + 'Z').toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="py-12 text-center text-gray-500 italic text-sm">Belum ada riwayat perubahan status.</div>
                  );
                })()}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Activity size={16} className="text-indigo-500" />
                Riwayat Perubahan Sub Status
              </h4>
              <div className="max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {parsedHistory.length > 0 ? (
                  <ul className="space-y-3">
                    {parsedHistory.map((h, i) => (
                      <li key={i} className="flex flex-col text-sm border-b border-gray-50 dark:border-gray-700/50 pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-gray-800 dark:text-gray-200">{h.sub_status || '-'}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                            {formatDuration(h.duration_minutes)}
                          </span>
                        </div>
                        {h.ended_at && (
                          <span className="text-gray-400 dark:text-gray-500 text-[10px] mt-1">
                            Selesai pada: {new Date(h.ended_at.includes('T') ? h.ended_at : h.ended_at.replace(' ', 'T') + 'Z').toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="py-12 text-center text-gray-500 italic text-sm">Belum ada riwayat perubahan sub status.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 animate-in fade-in duration-300">
            <DocumentManager projectUid={project.uid} />
          </div>
        )}
      </div>
    </div>
  );
};
