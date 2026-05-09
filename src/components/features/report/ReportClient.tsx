// Main report page container with data fetching logic
'use client';

import React, { useMemo, useState } from 'react';
import { Project } from '@/lib/db';
import { parseExcelDate } from '@/utils/project';
import { AREA_BRANCH_MAP } from '@/lib/constants';
import dynamic from 'next/dynamic';
import { ReportFilters, Granularity } from './ReportFilters';
import { ReportKpiGrid } from './ReportKpiGrid';

// Dynamically import heavy chart components
const PerformanceCharts = dynamic(() => import('./PerformanceCharts').then(mod => mod.PerformanceCharts), {
  loading: () => <div className="h-[400px] w-full animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl" />,
  ssr: false
});

const BranchRanking = dynamic(() => import('./BranchRanking').then(mod => mod.BranchRanking), {
  loading: () => <div className="h-[300px] w-full animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl" />,
  ssr: false
});

interface Props {
  initialProjects: Project[];
}

interface TrendEntry {
  name: string;
  actual: number;
  planned: number;
  timestamp: number;
}


export default function ReportClient({ initialProjects }: Props) {
  const [granularity, setGranularity] = useState<Granularity>('monthly');
  const [areaFilter, setAreaFilter] = useState<string>('');
  const [branchFilter, setBranchFilter] = useState<string>('');

  const handleAreaFilterChange = (val: string) => {
    setAreaFilter(val);
    setBranchFilter('');
  };

  const stats = useMemo(() => {
    const projects = initialProjects.filter(p => {
      const matchesArea = !areaFilter || p.area === areaFilter;
      const matchesBranch = !branchFilter || p.branch === branchFilter;
      return matchesArea && matchesBranch;
    });

    let totalPlannedPorts = 0;
    let totalRealizedPorts = 0;
    let totalLeadTimeDays = 0;
    let lateProjects = 0;
    let onTimeProjects = 0;

    const timeSeriesMap = new Map<string, { name: string; actual: number; planned: number; timestamp: number }>();
    const branchMap = new Map<string, { name: string; planned: number; actual: number }>();

    projects.forEach(p => {
      const planPort = p.port_planned || 0;
      const realPort = p.port_realized || 0;
      const goliveDate = parseExcelDate(p.golive_actual);

      let targetDate = parseExcelDate(p.golive_target);

      const branch = (p.branch || 'UNKNOWN').toUpperCase();

      totalPlannedPorts += planPort;
      totalRealizedPorts += realPort;

      const bData = branchMap.get(branch) || { name: branch, planned: 0, actual: 0 };
      bData.planned += planPort;
      bData.actual += realPort;
      branchMap.set(branch, bData);

      if (goliveDate) {
        if (targetDate) {
          if (goliveDate <= targetDate) {
            onTimeProjects++;
          } else {
            lateProjects++;
            const diffDays = Math.ceil((goliveDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
            totalLeadTimeDays += diffDays;
          }
        }

        let key = '';
        let label = '';
        const d = goliveDate;

        if (granularity === 'daily') {
          key = d.toISOString().split('T')[0];
          label = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        } else if (granularity === 'weekly') {
          const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
          const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
          const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
          key = `${d.getFullYear()}-W${weekNum}`;
          label = `W${weekNum} ${d.getFullYear()}`;
        } else if (granularity === 'monthly') {
          key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          label = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
        } else {
          key = `${d.getFullYear()}`;
          label = `${d.getFullYear()}`;
        }

        const existing = timeSeriesMap.get(key) || { name: label, actual: 0, planned: 0, timestamp: d.getTime() };
        existing.actual += realPort;
        existing.planned += planPort;
        timeSeriesMap.set(key, existing);
      }
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
        ...b,
        achievement: b.planned > 0 ? Math.round((b.actual / b.planned) * 100) : 0
      }))
      .sort((a, b) => b.achievement - a.achievement);

    const slaData = [
      { name: 'On Time', value: onTimeProjects, color: '#10b981' },
      { name: 'Late', value: lateProjects, color: '#ef4444' }
    ];

    return {
      totalPlannedPorts,
      totalRealizedPorts,
      achievementRate: totalPlannedPorts > 0 ? Math.round((totalRealizedPorts / totalPlannedPorts) * 100) : 0,
      slaRate: (onTimeProjects + lateProjects) > 0 ? Math.round((onTimeProjects / (onTimeProjects + lateProjects)) * 100) : 0,
      avgDelayDays,
      velocityTrend,
      trendData,
      branchData,
      slaData,
      onTimeProjects,
      lateProjects
    };
  }, [initialProjects, granularity, areaFilter, branchFilter]);


  return (
    <div className="space-y-6 pb-10">
      <ReportFilters
        granularity={granularity}
        setGranularity={setGranularity}
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
        trendData={stats.trendData}
        granularity={granularity}
      />

      <BranchRanking branchData={stats.branchData} />
    </div>
  );
}
