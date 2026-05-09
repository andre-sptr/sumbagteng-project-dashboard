// Main navigation sidebar
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Database,
  X,
  Activity,
  FileText,
  ClipboardList,
  Receipt,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

const PRIMARY_NAV_ITEM: NavItem = {
  href: '/dashboard',
  label: 'Dashboard',
  icon: LayoutDashboard,
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Monitoring',
    icon: Activity,
    items: [
      { href: '/report', label: 'Report', icon: BarChart3 },
    ],
  },
  {
    label: 'Project Tracking',
    icon: ClipboardList,
    items: [
      { href: '/projects', label: 'Projects Data', icon: Database },
      { href: '/boq', label: 'BoQ Plan', icon: Receipt },
      { href: '/aanwijzing', label: 'Catatan AANWIJZING', icon: FileText },
      { href: '/ut', label: 'Rekap UT', icon: ClipboardList },
    ],
  },
  {
    label: 'Administration',
    icon: Settings,
    items: [
      { href: '/settings/sync', label: 'Settings', icon: Settings },
    ],
  },
];

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/');
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const activeGroup = useMemo(
    () =>
      NAV_GROUPS.find((group) =>
        group.items.some((item) => isActiveRoute(pathname, item.href))
      )?.label,
    [pathname]
  );
  const [groupState, setGroupState] = useState<{
    pathname: string;
    overrides: Record<string, boolean>;
  }>({ pathname, overrides: {} });
  const groupOverrides = groupState.pathname === pathname ? groupState.overrides : {};

  const toggleGroup = (label: string) => {
    setGroupState((current) => {
      const currentOverrides =
        current.pathname === pathname ? current.overrides : {};
      const isOpen = currentOverrides[label] ?? label === activeGroup;

      return {
        pathname,
        overrides: {
          ...currentOverrides,
          [label]: !isOpen,
        },
      };
    });
  };

  const renderNavLink = (item: NavItem, nested = false) => {
    const Icon = item.icon;
    const isActive = isActiveRoute(pathname, item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${nested ? 'px-3 py-2 ml-5' : 'px-3 py-2.5'
          } ${isActive
            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
          }`}
      >
        <Icon size={18} />
        {item.label}
      </Link>
    );
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-50 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-800">
            <Link
              href="/dashboard"
              className="flex items-center gap-2"
              onClick={onClose}
            >
              <div className="p-1.5 bg-blue-600 rounded-lg text-white">
                <Activity size={18} />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  Sumbagteng
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Projects Dashboard
                </span>
              </div>
            </Link>

            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Tutup sidebar"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {renderNavLink(PRIMARY_NAV_ITEM)}

            <div className="pt-2 space-y-1">
              {NAV_GROUPS.map((group) => {
                const Icon = group.icon;
                const isExpanded =
                  groupOverrides[group.label] ?? group.label === activeGroup;
                const isGroupActive = group.label === activeGroup;
                const contentId = `sidebar-group-${group.label.toLowerCase().replace(/\s+/g, '-')}`;
                const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

                return (
                  <div key={group.label} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.label)}
                      aria-expanded={isExpanded}
                      aria-controls={contentId}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${isGroupActive
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                        }`}
                    >
                      <Icon size={18} />
                      <span className="flex-1 text-left">{group.label}</span>
                      <ChevronIcon size={16} />
                    </button>

                    {isExpanded && (
                      <div id={contentId} className="space-y-1">
                        {group.items.map((item) => renderNavLink(item, true))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>

          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
            <p className="text-[11px] text-gray-500 dark:text-gray-500">
              SLA Project Tracking
              <br />
              <span className="text-gray-400 dark:text-gray-600">v0.1.0</span>
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
