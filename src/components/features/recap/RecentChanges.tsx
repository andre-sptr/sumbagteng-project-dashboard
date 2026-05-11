// Feed of recent project updates or log entries
import React from 'react';
import { Clock } from 'lucide-react';
import type { Project } from '@/types/database';
import { calculateCurrentDuration } from '@/utils/duration';

interface RecentChangesProps {
  recent: Project[];
}

export const RecentChanges = ({ recent }: RecentChangesProps) => {
  return (
    <section className="glass-panel rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={18} className="text-blue-600" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Perubahan Terbaru
        </h3>
      </div>

      {recent.length ? (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {recent.map((p) => (
            <li
              key={p.uid}
              className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {p.id_ihld}
                </p>
                <p
                  className="text-xs text-gray-500 dark:text-gray-400 truncate"
                  title={p.nama_lop}
                >
                  {p.nama_lop || '-'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {p.status || '-'}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  {p.sub_status || '-'}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  {calculateCurrentDuration(p.last_changed_at)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500 italic">Belum ada data project.</p>
      )}
    </section>
  );
};
