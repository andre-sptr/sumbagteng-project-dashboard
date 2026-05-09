// Unit tests for Project tracking repository
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { db } from '@/lib/db';

// Mock the database to use an in-memory instance for tests
vi.mock('@/lib/db', async () => {
  const Database = (await import('better-sqlite3')).default;
  const { runMigrations } = await import('@/lib/migrations');
  const mockDb = new Database(':memory:');
  runMigrations(mockDb);
  return {
    db: mockDb,
  };
});

const baseProject = {
  uid: 'PROJ001::BATCH1',
  id_ihld: 'PROJ001',
  batch_program: 'BATCH1',
  nama_lop: 'Test Project',
  region: 'SUMBAGTENG',
  status: 'In Progress',
  sub_status: 'Planning',
  full_data: '[]',
  history: '[]',
  area: 'RIDAR',
  branch: 'PEKANBARU',
  mitra: 'PT ABC',
  sto: 'PKU',
  odp_planned: 10,
  port_planned: 128,
  port_realized: 0,
  golive_target: '',
  golive_actual: '',
};

describe('ProjectRepository', () => {
  beforeEach(() => {
    db.prepare('DELETE FROM projects').run();
  });

  it('should upsert a project correctly', () => {
    ProjectRepository.upsert(baseProject);

    const project = ProjectRepository.findByUid('PROJ001::BATCH1');
    expect(project).toBeDefined();
    expect(project?.nama_lop).toBe('Test Project');
    expect(project?.id_ihld).toBe('PROJ001');
    expect(project?.area).toBe('RIDAR');
    expect(project?.port_planned).toBe(128);
  });

  it('should find projects by region', () => {
    ProjectRepository.upsert({ ...baseProject, uid: 'P1', id_ihld: 'P1', region: 'REGION1' });
    ProjectRepository.upsert({ ...baseProject, uid: 'P2', id_ihld: 'P2', region: 'REGION2' });

    const region1Projects = ProjectRepository.findAllByRegion('REGION1');
    expect(region1Projects).toHaveLength(1);
    expect(region1Projects[0].uid).toBe('P1');
  });

  it('should update an existing project on conflict', () => {
    ProjectRepository.upsert(baseProject);
    ProjectRepository.upsert({ ...baseProject, status: 'NEW' });

    const project = ProjectRepository.findByUid('PROJ001::BATCH1');
    expect(project?.status).toBe('NEW');
  });

  it('should return project info for select', () => {
    ProjectRepository.upsert({ ...baseProject, uid: 'P1', id_ihld: 'P1', nama_lop: 'Z Project' });
    ProjectRepository.upsert({ ...baseProject, uid: 'P2', id_ihld: 'P2', nama_lop: 'A Project' });

    const selectData = ProjectRepository.getForSelect();
    expect(selectData).toHaveLength(2);
    expect(selectData[0].nama_lop).toBe('A Project'); // Ordered by name
  });
});
