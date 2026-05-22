// Main report page container with data fetching logic
'use client';

import React, { useMemo, useState } from 'react';
import type { Project } from '@/types/database';
import { parseExcelDate, getFullDataArray, parseNumber, classifyStatus } from '@/utils/project';
import { getKomitmenGoliveDate, buildDashboardStats } from '@/lib/dashboard-stats';
import { AREA_BRANCH_MAP } from '@/lib/constants';
import { DEFAULT_COLUMN_MAP, type ColumnMap } from '@/lib/sheet-columns';
import dynamic from 'next/dynamic';
import { ReportFilters } from './ReportFilters';
import { ReportKpiGrid } from './ReportKpiGrid';

// Dynamically import heavy chart components
const PerformanceCharts = dynamic(() => import('./PerformanceCharts').then(mod => mod.PerformanceCharts), {
  loading: () => <div className="h-[400px] w-full animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl" />,
  ssr: false
});

const TimelineChart = dynamic(() => import('@/components/features/recap/TimelineChart').then(mod => mod.TimelineChart), {
  loading: () => <div className="h-[400px] w-full animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl" />,
  ssr: false
});

const BranchRanking = dynamic(() => import('./BranchRanking').then(mod => mod.BranchRanking), {
  loading: () => <div className="h-[300px] w-full animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl" />,
  ssr: false
});

interface Props {
  initialProjects: Project[];
  colMap?: ColumnMap;
}

interface TrendEntry {
  name: string;
  actual: number;
  timestamp: number;
}


const now = new Date();

export default function ReportClient({ initialProjects, colMap = DEFAULT_COLUMN_MAP }: Props) {
  const [areaFilter, setAreaFilter] = useState<string>('');
  const [branchFilter, setBranchFilter] = useState<string>('');
  const [year, setYear] = useState<number | 'all'>(now.getFullYear());
  const [month, setMonth] = useState<number | 'all'>(now.getMonth());

  const handleAreaFilterChange = (val: string) => {
    setAreaFilter(val);
    setBranchFilter('');
  };

  // Distinct komitmen-golive years available in the data (+ current year).
  const years = useMemo(() => {
    const set = new Set<number>();
    for (const p of initialProjects) {
      const d = getKomitmenGoliveDate(p, colMap);
      if (d) set.add(d.getFullYear());
    }
    set.add(now.getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [initialProjects, colMap]);

  const stats = useMemo(() => {
    // Area/branch filter applies to everything; the month/year (komitmen golive)
    // filter narrows only the KPIs, SLA, and branch ranking. The golive-per-month
    // trend and velocity always show the full monthly series.
    const areaBranchFiltered = initialProjects.filter(p => {
      const matchesArea = !areaFilter || p.area === areaFilter;
      const matchesBranch = !branchFilter || p.branch === branchFilter;
      return matchesArea && matchesBranch;
    });

    const dateFiltered = (year === 'all' && month === 'all')
      ? areaBranchFiltered
      : areaBranchFiltered.filter(p => {
          const d = getKomitmenGoliveDate(p, colMap);
          if (!d) return false;
          if (year !== 'all' && d.getFullYear() !== year) return false;
          if (month !== 'all' && d.getMonth() !== month) return false;
          return true;
        });

    const STATUS_COLS = ['0. DROP','1. AANWIJZING','2. DONE AANWIJZING','3. PERIZINAN','4. MATDEL','5. INSTALASI','6. FINISH INSTALASI','7. GOLIVE','8. UJI TERIMA'] as const;
    type StatusCol = typeof STATUS_COLS[number];

    // --- KPI + SLA + branch ranking: respect month/year filter ---
    let totalPlannedPorts = 0;
    let totalRealizedPorts = 0;
    let donePorts = 0;
    let totalLeadTimeDays = 0;
    let lateProjects = 0;
    let onTimeProjects = 0;

    const globalStatusCounts = Object.fromEntries(STATUS_COLS.map(s => [s, 0])) as Record<StatusCol, number>;
    const branchMap = new Map<string, { name: string; planned: number; actual: number; statusCounts: Record<StatusCol, number> }>();

    dateFiltered.forEach(p => {
      const fullData = getFullDataArray(p);
      const planPort = parseNumber(fullData[colMap.PORT_PLAN]);
      const realPort = parseNumber(fullData[colMap.REAL_JML_PORT_GOLIVE]);
      const goliveDate = parseExcelDate(fullData[colMap.TANGGAL_GOLIVE]);
      const targetDate = parseExcelDate(fullData[colMap.KOMITMEN_GOLIVE]);
      const branch = (p.branch || 'UNKNOWN').toUpperCase();

      totalPlannedPorts += planPort;
      totalRealizedPorts += realPort;
      if (classifyStatus(p.status) === 'done') donePorts += planPort;

      const emptyStatusCounts = Object.fromEntries(STATUS_COLS.map(s => [s, 0])) as Record<StatusCol, number>;
      const bData = branchMap.get(branch) || { name: branch, planned: 0, actual: 0, statusCounts: emptyStatusCounts };
      bData.planned += planPort;
      bData.actual += realPort;
      const normalizedStatus = (p.status || '').trim() as StatusCol;
      if (STATUS_COLS.includes(normalizedStatus)) {
        bData.statusCounts[normalizedStatus] = (bData.statusCounts[normalizedStatus] || 0) + planPort;
        globalStatusCounts[normalizedStatus] = (globalStatusCounts[normalizedStatus] || 0) + planPort;
      }
      branchMap.set(branch, bData);

      if (goliveDate && targetDate) {
        if (goliveDate <= targetDate) {
          onTimeProjects++;
        } else {
          lateProjects++;
          totalLeadTimeDays += Math.ceil((goliveDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
        }
      }
    });

    // --- Golive timeline + total golive ports: always all months ---
    // Reuse the dashboard builder so the "Tanggal Golive per Bulan" card is
    // identical to the dashboard (continuous month range, PORT_PLAN per month).
    const goliveStats = buildDashboardStats(areaBranchFiltered, colMap);

    // --- Velocity trend (cumulative realized golive ports) ---
    const timeSeriesMap = new Map<string, { name: string; actual: number; timestamp: number }>();

    areaBranchFiltered.forEach(p => {
      const fullData = getFullDataArray(p);
      const realPort = parseNumber(fullData[colMap.REAL_JML_PORT_GOLIVE]);
      const goliveDate = parseExcelDate(fullData[colMap.TANGGAL_GOLIVE]);
      if (!goliveDate) return;

      const d = goliveDate;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
      const existing = timeSeriesMap.get(key) || { name: label, actual: 0, timestamp: d.getTime() };
      existing.actual += realPort;
      timeSeriesMap.set(key, existing);
    });

    const avgDelayDays = lateProjects > 0 ? Math.round(totalLeadTimeDays / lateProjects) : 0;
    const trendData = Array.from(timeSeriesMap.values()).sort((a, b) => a.timestamp - b.timestamp);

    const velocityTrend: (TrendEntry & { cumulative: number })[] = [];
    let runningTotal = 0;
    trendData.forEach(d => {
      runningTotal += d.actual;
      velocityTrend.push({ ...d, cumulative: runningTotal });
    });

    const branchData = Array.from(branchMap.values())
      .map(b => ({
        name: b.name,
        planned: b.planned,
        actual: b.actual,
        statusCounts: b.statusCounts,
        achievement: (() => {
          const golive = (b.statusCounts['7. GOLIVE'] || 0) + (b.statusCounts['8. UJI TERIMA'] || 0);
          const total = STATUS_COLS
            .filter(s => s !== '0. DROP')
            .reduce((sum, s) => sum + (b.statusCounts[s] || 0), 0);
          return total > 0 ? Math.round((golive / total) * 10000) / 100 : 0;
        })(),
      }))
      .sort((a, b) => b.achievement - a.achievement);

    const slaData = [
      { name: 'On Time', value: onTimeProjects, color: '#10b981' },
      { name: 'Late', value: lateProjects, color: '#ef4444' }
    ];

    const overallAchiev = (() => {
      const golive = (globalStatusCounts['7. GOLIVE'] || 0) + (globalStatusCounts['8. UJI TERIMA'] || 0);
      const total = STATUS_COLS
        .filter(s => s !== '0. DROP')
        .reduce((sum, s) => sum + (globalStatusCounts[s] || 0), 0);
      return total > 0 ? Math.round((golive / total) * 10000) / 100 : 0;
    })();

    return {
      totalPlannedPorts,
      totalRealizedPorts,
      donePorts,
      overallAchiev,
      achievementRate: totalPlannedPorts > 0 ? Math.round((totalRealizedPorts / totalPlannedPorts) * 100) : 0,
      slaRate: (onTimeProjects + lateProjects) > 0 ? Math.round((onTimeProjects / (onTimeProjects + lateProjects)) * 100) : 0,
      avgDelayDays,
      velocityTrend,
      branchData,
      slaData,
      onTimeProjects,
      lateProjects,
      goliveMonthList: goliveStats.goliveMonthList,
      totalGolivePorts: goliveStats.totalGolivePorts,
    };
  }, [initialProjects, year, month, areaFilter, branchFilter, colMap]);


  return (
    <div className="space-y-6 pb-10">
      <ReportFilters
        month={month}
        setMonth={setMonth}
        year={year}
        setYear={setYear}
        years={years}
        areaFilter={areaFilter}
        setAreaFilter={handleAreaFilterChange}
        branchFilter={branchFilter}
        setBranchFilter={setBranchFilter}
        areaBranchMap={AREA_BRANCH_MAP}
      />

      <ReportKpiGrid stats={stats} />

      <PerformanceCharts
        velocityTrend={stats.velocityTrend}
        slaData={stats.slaData}
        onTimeProjects={stats.onTimeProjects}
        lateProjects={stats.lateProjects}
        avgDelayDays={stats.avgDelayDays}
        slaRate={stats.slaRate}
      />

      <BranchRanking branchData={stats.branchData} />

      <TimelineChart
        goliveMonthList={stats.goliveMonthList}
        totalGolivePorts={stats.totalGolivePorts}
      />
    </div>
  );
}
