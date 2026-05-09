// Global application header with sync action
'use client';

import { Menu } from 'lucide-react';
import SyncButton from '@/components/ui/SyncButton';

interface TopbarProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
}

export default function Topbar({ title, subtitle, onMenuClick }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-3 px-4 md:px-6 py-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Buka menu"
        >
          <Menu size={20} />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-base md:text-lg font-bold text-gray-900 dark:text-white truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 truncate">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <SyncButton />
        </div>
      </div>
    </header>
  );
}
