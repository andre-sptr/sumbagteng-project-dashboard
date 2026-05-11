// Main performance dashboard with project status summaries
import { ProjectRepository } from '@/repositories/ProjectRepository';
import type { Project } from '@/types/database';
import DashboardRecap from '@/components/features/dashboard/DashboardRecap';
import type { DashboardStats } from '@/types/dashboard';
import {
  classifyStatus,
  formatExcelDateShort,
  getFullDataArray,
  getPortCount,
  isGoliveTimelineStatus,
} from '@/utils/project';

export const dynamic = 'force-dynamic';

function buildDashboardStats(projects: Project[]): DashboardStats {
  let totalPorts = 0;
  let donePorts = 0;
  let progressPorts = 0;
  let cancelledPorts = 0;
  let otherPorts = 0;

  const statusMap = new Map<string, number>();
  const goliveMonthMap = new Map<string, number>();
  const branchGoliveMap = new Map<string, { done: number; total: number }>();
  let totalGolivePorts = 0;

  for (const project of projects) {
    const fullData = getFullDataArray(project);
    const ports = getPortCount(fullData);
    const bucket = classifyStatus(project.status);

    totalPorts += ports;
    if (bucket === 'done') donePorts += ports;
    else if (bucket === 'progress') progressPorts += ports;
    else if (bucket === 'cancelled') cancelledPorts += ports;
    else otherPorts += ports;

    const status = project.status || '-';
    statusMap.set(status, (statusMap.get(status) || 0) + ports);

    const goliveStr = formatExcelDateShort(fullData[31]);
    if (goliveStr && isGoliveTimelineStatus(project.status)) {
      totalGolivePorts += ports;
      goliveMonthMap.set(goliveStr, (goliveMonthMap.get(goliveStr) || 0) + ports);
    }

    const branch = (project.branch || 'UNKNOWN').toUpperCase();
    const branchEntry = branchGoliveMap.get(branch) || { done: 0, total: 0 };
    branchEntry.total += ports;
    if (bucket === 'done') branchEntry.done += ports;
    branchGoliveMap.set(branch, branchEntry);
  }

  const goliveMonthList: { name: string; count: number }[] = [];
  const parsedMonths = Array.from(goliveMonthMap.keys())
    .map((label) => {
      const parts = label.split(' ');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = monthNames.findIndex(m => m.toLowerCase() === parts[0].toLowerCase());
      return { label, year: parseInt(parts[1]), month: monthIndex % 12 };
    })
    .filter(m => !isNaN(m.year) && m.year >= 1900 && m.year <= 2100 && m.month >= 0);

  if (parsedMonths.length > 0) {
    const minYear = Math.min(...parsedMonths.map(m => m.year));
    const maxYear = Math.max(...parsedMonths.map(m => m.year));
    const minMonth = Math.min(...parsedMonths.filter(m => m.year === minYear).map(m => m.month));
    const maxMonth = Math.max(...parsedMonths.filter(m => m.year === maxYear).map(m => m.month));

    for (let year = minYear; year <= maxYear; year++) {
      const startMonth = year === minYear ? minMonth : 0;
      const endMonth = year === maxYear ? maxMonth : 11;
      for (let month = startMonth; month <= endMonth; month++) {
        const date = new Date(year, month, 1);
        const label = date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
        goliveMonthList.push({ name: label, count: goliveMonthMap.get(label) || 0 });
      }
    }
  }

  const recent = projects.slice(0, 5).map((project) => ({
    uid: project.uid,
    id_ihld: project.id_ihld,
    batch_program: '',
    nama_lop: project.nama_lop,
    region: '',
    status: project.status,
    sub_status: project.sub_status,
    full_data: '[]',
    last_changed_at: project.last_changed_at,
    history: '[]',
    area: '',
    branch: '',
    mitra: '',
    sto: '',
    odp_planned: 0,
    port_planned: 0,
    port_realized: 0,
    golive_target: null,
    golive_actual: null,
  }));

  return {
    total: projects.length,
    totalPorts,
    donePorts,
    progressPorts,
    cancelledPorts,
    otherPorts,
    statusList: Array.from(statusMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        const aNum = parseFloat(a.name) || 0;
        const bNum = parseFloat(b.name) || 0;
        return bNum - aNum;
      }),
    totalGolivePorts,
    goliveMonthList,
    branchGoliveData: Array.from(branchGoliveMap.entries())
      .map(([name, value]) => ({
        name,
        done: value.done,
        achiev: value.total > 0 ? Math.round((value.done / value.total) * 100) : 0,
      }))
      .sort((a, b) => b.achiev - a.achiev),
    recent,
  };
}

export default async function DashboardPage() {
  let projects: Project[] = [];

  try {
    projects = ProjectRepository.findAllByRegion('SUMBAGTENG');
  } catch (error) {
    console.error('Failed to fetch projects from DB:', error);
    throw new Error('Gagal mengambil data dari database.');
  }

  return <DashboardRecap stats={buildDashboardStats(projects)} />;
}
