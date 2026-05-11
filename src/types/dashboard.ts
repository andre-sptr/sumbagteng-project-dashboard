import type { Project } from '@/types/database';

export interface DashboardStats {
  total: number;
  totalPorts: number;
  donePorts: number;
  progressPorts: number;
  cancelledPorts: number;
  otherPorts: number;
  statusList: { name: string; count: number }[];
  totalGolivePorts: number;
  goliveMonthList: { name: string; count: number }[];
  branchGoliveData: { name: string; done: number; achiev: number }[];
  recent: Project[];
}
