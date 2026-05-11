// Detailed KPI analytics and reporting interface
import { ProjectRepository } from '@/repositories/ProjectRepository';
import type { Project } from '@/types/database';
import ReportClient from '@/components/features/report/ReportClient';

export const dynamic = 'force-dynamic';

export default async function ReportPage() {
  let projects: Project[] = [];

  try {
    projects = ProjectRepository.findAllByRegion('SUMBAGTENG');
  } catch (error) {
    console.error('Failed to fetch projects from DB:', error);
    throw new Error('Gagal mengambil data dari database.');
  }

  return <ReportClient initialProjects={projects} />;
}
