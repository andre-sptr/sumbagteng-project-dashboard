// Expandable table row for individual project data
import React from 'react';
import { ChevronDown, Activity, Database } from 'lucide-react';
import type { Project } from '@/types/database';
import { HistoryEntry, formatDuration } from '@/utils/duration';
import { formatExcelDate, getFullDataArray, classifyStatus, type StatusBucket } from '@/utils/project';
import { parseJsonArray } from '@/utils/json';
import { DurationCounter } from './DurationCounter';
import {
  COLUMN_FIELDS,
  DEFAULT_COLUMN_MAP,
  type ColKey,
  type ColumnConfigEntry,
} from '@/lib/sheet-columns';

interface Props {
  project: Project;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  getStatusColor: (status: string) => string;
  columnConfig?: ColumnConfigEntry[];
}

const DEFAULT_RAW_COLUMN_CONFIG: ColumnConfigEntry[] = COLUMN_FIELDS.map((field, sort_order) => ({
  field_key: field.key,
  label: field.label,
  header_text: field.headerText,
  col_index: field.defaultIndex,
  sort_order,
}));

export const RAW_DATA_HEADERS = DEFAULT_RAW_COLUMN_CONFIG.map((field) => field.label);

const DATE_FIELD_KEYS = new Set<ColKey>([
  'KOMITMEN_GOLIVE',
  'TARGET_GOLIVE_APRIL',
  'TANGGAL_GOLIVE',
]);
const NUMBER_FIELD_KEYS = new Set<ColKey>([
  'ODP_PLAN',
  'PORT_PLAN',
  'CPP',
  'BOQ',
  'REAL_JML_ODP_8',
  'REAL_JML_ODP_16',
  'REAL_JML_PORT_GOLIVE',
  'NILAI_PRELIM',
  'NILAI_BOQ_QE',
  'BOQ_AANWIJZING',
  'ODP_AANWIJZING',
]);

// Logical groupings for the "Informasi Proyek" tab so the 36 raw fields read as
// scannable sections instead of one flat grid. Field membership is by stable
// field_key; the configured col_index still drives which sheet cell is shown.
const INFO_FIELD_GROUPS: { title: string; dot: string; keys: ColKey[] }[] = [
  { title: 'Identitas Proyek', dot: 'bg-blue-500', keys: ['TAHUN', 'ID_IHLD', 'NAMA_LOP', 'BATCH_PROGRAM', 'MITRA'] },
  { title: 'Lokasi', dot: 'bg-cyan-500', keys: ['REGIONAL', 'AREA', 'STO', 'REGION_FMC', 'BRANCH_FMC'] },
  { title: 'Perencanaan', dot: 'bg-violet-500', keys: ['ODP_PLAN', 'PORT_PLAN', 'CPP', 'BOQ'] },
  { title: 'Status & Progres', dot: 'bg-amber-500', keys: ['STATUS', 'SUB_STATUS_KONS', 'DETAIL_STATUS', 'PROGRES_MINOL', 'PRIORITAS_1_TSEL', 'PID_PROACTIVE'] },
  { title: 'Golive', dot: 'bg-emerald-500', keys: ['KOMITMEN_GOLIVE', 'TARGET_GOLIVE_APRIL', 'STATUS_GOLIVE', 'TANGGAL_GOLIVE', 'KENDALA_GOLIVE'] },
  { title: 'Realisasi', dot: 'bg-teal-500', keys: ['REAL_JML_ODP_8', 'REAL_JML_ODP_16', 'REAL_JML_PORT_GOLIVE', 'ID_SW_ABD'] },
  { title: 'Finansial & BoQ', dot: 'bg-rose-500', keys: ['NILAI_PRELIM', 'NILAI_BOQ_QE', 'BOQ_AANWIJZING', 'ODP_AANWIJZING'] },
  { title: 'Lainnya', dot: 'bg-slate-400', keys: ['KET', 'WASPANG', 'PROJECT_ADMIN'] },
];

interface InfoGroup {
  title: string;
  dot: string;
  fields: ColumnConfigEntry[];
}

// Resolve the static groups against the live column config, keeping any
// ungrouped fields visible under a trailing "Data Tambahan" section.
function buildInfoGroups(columnConfig: ColumnConfigEntry[]): InfoGroup[] {
  const byKey = new Map(columnConfig.map((f) => [f.field_key, f]));
  const used = new Set<ColKey>();
  const groups: InfoGroup[] = [];

  for (const group of INFO_FIELD_GROUPS) {
    const fields: ColumnConfigEntry[] = [];
    for (const key of group.keys) {
      const entry = byKey.get(key);
      if (entry) {
        fields.push(entry);
        used.add(key);
      }
    }
    if (fields.length > 0) groups.push({ title: group.title, dot: group.dot, fields });
  }

  const leftovers = columnConfig.filter((f) => !used.has(f.field_key));
  if (leftovers.length > 0) {
    groups.push({ title: 'Data Tambahan', dot: 'bg-slate-400', fields: leftovers });
  }

  return groups;
}

const STATUS_ACCENT: Record<StatusBucket, string> = {
  done: 'border-l-emerald-400 dark:border-l-emerald-500',
  progress: 'border-l-blue-400 dark:border-l-blue-500',
  cancelled: 'border-l-red-400 dark:border-l-red-500',
  other: 'border-l-slate-300 dark:border-l-slate-600',
};

function getDisplayColumnConfig(columnConfig?: ColumnConfigEntry[]): ColumnConfigEntry[] {
  const rows = columnConfig && columnConfig.length > 0 ? columnConfig : DEFAULT_RAW_COLUMN_CONFIG;
  return [...rows].sort((a, b) => a.sort_order - b.sort_order);
}

function getColumnIndex(columnConfig: ColumnConfigEntry[], key: ColKey): number {
  return columnConfig.find((field) => field.field_key === key)?.col_index ?? DEFAULT_COLUMN_MAP[key];
}

function formatRawColumnValue(fieldKey: ColKey, value: unknown): string {
  const isEmpty = value === null || value === undefined || value === '' || String(value).trim() === '#N/A';
  if (DATE_FIELD_KEYS.has(fieldKey)) return formatExcelDate(value);
  if (NUMBER_FIELD_KEYS.has(fieldKey)) {
    return isEmpty ? '-' : (isNaN(Number(value)) ? String(value) : Number(value).toLocaleString('en-US'));
  }
  return isEmpty ? '-' : String(value);
}

export const ProjectRow = ({ project, index, isExpanded, onToggle, getStatusColor, columnConfig }: Props) => {
  const parsedHistory = parseJsonArray<HistoryEntry>(project.history || '[]');
  const fullData = getFullDataArray(project);
  const displayColumnConfig = getDisplayColumnConfig(columnConfig);

  const rawValue = (key: ColKey): string => {
    const v = fullData[getColumnIndex(displayColumnConfig, key)];
    const s = v === null || v === undefined ? '' : String(v).trim();
    return s === '' || s === '#N/A' ? '' : s;
  };

  const idIhld = rawValue('ID_IHLD') || project.id_ihld;
  const namaLop = rawValue('NAMA_LOP') || project.nama_lop;
  const batchProgram = rawValue('BATCH_PROGRAM') || project.batch_program;
  const status = rawValue('STATUS') || project.status;
  const subStatus = rawValue('SUB_STATUS_KONS') || project.sub_status;

  const tanggalGoliveIndex = getColumnIndex(displayColumnConfig, 'TANGGAL_GOLIVE');
  const displayTanggalGolive = formatExcelDate(fullData[tanggalGoliveIndex]);
  const staggerClass = index < 10 ? `stagger-${(index % 4) + 1}` : '';
  const statusBucket = classifyStatus(status);
  const rowBg = isExpanded
    ? 'bg-blue-50/70 dark:bg-blue-900/20'
    : index % 2 === 0
      ? 'bg-white dark:bg-gray-900/40'
      : 'bg-gray-50/60 dark:bg-gray-800/30';

  return (
    <React.Fragment>
      <tr
        className={`group transition-colors cursor-pointer animate-in ${staggerClass} ${rowBg} hover:bg-blue-50/50 dark:hover:bg-gray-800/60`}
        onClick={onToggle}
      >
        <td className={`px-6 py-4 align-top border-l-4 ${STATUS_ACCENT[statusBucket]}`}>
          <div className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{idIhld}</div>
          {batchProgram && (
            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/30 uppercase tracking-wide">
              {batchProgram}
            </span>
          )}
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate max-w-xs" title={namaLop}>
            {namaLop || '-'}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-center align-middle">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
            {status || '-'}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-center align-middle">
          {subStatus ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300">
              {subStatus}
            </span>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-600">-</span>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-center align-middle">
          {displayTanggalGolive !== '-' ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              {displayTanggalGolive}
            </span>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-600">-</span>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-center align-middle">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            <DurationCounter lastChangedAt={project.last_changed_at} />
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-center align-middle text-sm font-medium">
          <button
            aria-label={isExpanded ? 'Tutup detail' : 'Lihat detail'}
            aria-expanded={isExpanded}
            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            <ChevronDown size={20} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} className="px-0 py-0 bg-gray-50/50 dark:bg-gray-800/30">
            <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-200">
              <ProjectDetailTabs
                project={project}
                fullData={fullData}
                parsedHistory={parsedHistory}
                columnConfig={displayColumnConfig}
              />
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};

type ProjectDetailTab = 'info' | 'history';

const ProjectDetailTabs = ({
  project,
  fullData,
  parsedHistory,
  columnConfig,
}: {
  project: Project,
  fullData: unknown[],
  parsedHistory: HistoryEntry[],
  columnConfig: ColumnConfigEntry[],
}) => {
  const [activeTab, setActiveTab] = React.useState<ProjectDetailTab>('info');

  const tabs: { id: ProjectDetailTab; label: string; icon: React.ReactNode }[] = [
    { id: 'info', label: 'Informasi Proyek', icon: <Database size={16} /> },
    { id: 'history', label: 'Riwayat Status', icon: <Activity size={16} /> },
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
          <div className="space-y-4 max-h-[34rem] overflow-y-auto pr-2 custom-scrollbar animate-in fade-in duration-300">
            {buildInfoGroups(columnConfig).map((group) => (
              <section
                key={group.title}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
              >
                <div className="flex items-center gap-2.5 px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/60">
                  <span className={`w-2 h-2 rounded-full ${group.dot}`} />
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                    {group.title}
                  </h5>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 p-5">
                  {group.fields.map((field) => {
                    const displayVal = formatRawColumnValue(field.field_key, fullData[field.col_index]);
                    const isGolive = field.field_key === 'TANGGAL_GOLIVE';
                    return (
                      <div
                        key={field.field_key}
                        className={`flex flex-col gap-1 rounded-lg ${isGolive
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-200 dark:ring-emerald-800 px-3 py-1.5'
                          : ''
                          }`}
                      >
                        <dt className={`text-[10px] font-semibold uppercase tracking-wider ${isGolive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'
                          }`}>
                          {field.label}
                        </dt>
                        <dd
                          className={`text-sm font-medium break-words leading-snug ${isGolive
                            ? 'text-emerald-800 dark:text-emerald-300'
                            : 'text-gray-800 dark:text-gray-200'
                            }`}
                          title={String(displayVal)}
                        >
                          {displayVal}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </section>
            ))}
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
      </div>
    </div>
  );
};
