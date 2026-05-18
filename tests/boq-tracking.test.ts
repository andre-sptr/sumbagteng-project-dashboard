import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeSchema } from '../src/lib/schema';

const state = vi.hoisted(() => ({
  db: null as unknown as Database.Database,
}));

vi.mock('../src/lib/db', () => ({
  get db() {
    return state.db;
  },
}));

async function loadRepository() {
  vi.resetModules();
  state.db = new Database(':memory:');
  state.db.pragma('foreign_keys = ON');
  initializeSchema(state.db);
  return import('../src/repositories/BoqRepository');
}

function seedAanwijzingBoq(project: {
  boqId: string;
  aanwijzingId: string;
  idIhld: string;
  name: string;
}) {
  state.db.prepare(`
    INSERT INTO boq_aanwijzing (id, aanwijzing_id, nama_lop, id_ihld)
    VALUES (?, ?, ?, ?)
  `).run(project.boqId, project.aanwijzingId, project.name, project.idIhld);
}

function seedUtBoq(project: {
  boqUtId: string;
  utId: string;
  idIhld: string;
  name: string;
}) {
  state.db.prepare(`
    INSERT INTO boq_ut (id, ut_id, nama_lop, id_ihld)
    VALUES (?, ?, ?, ?)
  `).run(project.boqUtId, project.utId, project.name, project.idIhld);
}

function insertAanwijzingItem(item: {
  id: string;
  boqAanwijzingId: string;
  idIhld: string;
  no: number;
  designator: string;
  volume: number;
  total: number;
  isSection?: boolean;
}) {
  state.db.prepare(`
    INSERT INTO boq_aanwijzing_items (
      id, boq_aanwijzing_id, nama_lop, id_ihld, no, is_section,
      designator, volume, total
    ) VALUES (?, ?, 'LOP', ?, ?, ?, ?, ?, ?)
  `).run(
    item.id,
    item.boqAanwijzingId,
    item.idIhld,
    item.no,
    item.isSection ? 1 : 0,
    item.designator,
    item.volume,
    item.total
  );
}

function insertUtItem(item: {
  id: string;
  boqUtId: string;
  idIhld: string;
  no: number;
  designator: string;
  volume: number;
  total: number;
  isSection?: boolean;
}) {
  state.db.prepare(`
    INSERT INTO boq_ut_items (
      id, boq_ut_id, nama_lop, id_ihld, no, is_section,
      designator, volume, total
    ) VALUES (?, ?, 'LOP', ?, ?, ?, ?, ?, ?)
  `).run(
    item.id,
    item.boqUtId,
    item.idIhld,
    item.no,
    item.isSection ? 1 : 0,
    item.designator,
    item.volume,
    item.total
  );
}

describe('BoqRepository tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aggregates global aanwijzing, UT, remaining volume, and cost by designator', async () => {
    const { BoqRepository } = await loadRepository();

    seedAanwijzingBoq({ boqId: 'boqa-a', aanwijzingId: 'aanwijzing-a', idIhld: 'IHLD-A', name: 'Project A' });
    seedAanwijzingBoq({ boqId: 'boqa-b', aanwijzingId: 'aanwijzing-b', idIhld: 'IHLD-B', name: 'Project B' });
    seedUtBoq({ boqUtId: 'ut-a', utId: 'ut-a-parent', idIhld: 'IHLD-A', name: 'Project A' });
    seedUtBoq({ boqUtId: 'ut-b', utId: 'ut-b-parent', idIhld: 'IHLD-B', name: 'Project B' });

    insertAanwijzingItem({
      id: 'aanwijzing-section',
      boqAanwijzingId: 'boqa-a',
      idIhld: 'IHLD-A',
      no: 0,
      designator: 'MATERIAL',
      volume: 0,
      total: 0,
      isSection: true,
    });
    insertAanwijzingItem({
      id: 'aanwijzing-cable-a',
      boqAanwijzingId: 'boqa-a',
      idIhld: 'IHLD-A',
      no: 1,
      designator: 'CABLE-FO',
      volume: 100,
      total: 1000,
    });
    insertAanwijzingItem({
      id: 'aanwijzing-odp-a',
      boqAanwijzingId: 'boqa-a',
      idIhld: 'IHLD-A',
      no: 2,
      designator: 'ODP',
      volume: 10,
      total: 500,
    });
    insertAanwijzingItem({
      id: 'aanwijzing-cable-b',
      boqAanwijzingId: 'boqa-b',
      idIhld: 'IHLD-B',
      no: 1,
      designator: 'CABLE-FO',
      volume: 20,
      total: 200,
    });
    insertUtItem({
      id: 'ut-cable-a',
      boqUtId: 'ut-a',
      idIhld: 'IHLD-A',
      no: 1,
      designator: 'CABLE-FO',
      volume: 70,
      total: 700,
    });
    insertUtItem({
      id: 'ut-cable-b',
      boqUtId: 'ut-b',
      idIhld: 'IHLD-B',
      no: 1,
      designator: 'CABLE-FO',
      volume: 25,
      total: 250,
    });
    insertUtItem({
      id: 'ut-odp-b',
      boqUtId: 'ut-b',
      idIhld: 'IHLD-B',
      no: 2,
      designator: 'ODP',
      volume: 2,
      total: 100,
    });

    const tracking = BoqRepository.getTrackingGlobal();

    expect(tracking).toEqual([
      {
        designator: 'CABLE-FO',
        jumlah_project: 2,
        aanwijzing_vol: 120,
        aanwijzing_cost: 1200,
        ut_vol: 95,
        ut_cost: 950,
        remaining_vol: 25,
        remaining_cost: 250,
      },
      {
        designator: 'ODP',
        jumlah_project: 2,
        aanwijzing_vol: 10,
        aanwijzing_cost: 500,
        ut_vol: 2,
        ut_cost: 100,
        remaining_vol: 8,
        remaining_cost: 400,
      },
    ]);
  });

  it('aggregates project tracking without duplicating rows and includes UT-only designators', async () => {
    const { BoqRepository } = await loadRepository();

    seedAanwijzingBoq({ boqId: 'boqa-a', aanwijzingId: 'aanwijzing-a', idIhld: 'IHLD-A', name: 'Project A' });
    seedUtBoq({ boqUtId: 'ut-a', utId: 'ut-a-parent', idIhld: 'IHLD-A', name: 'Project A' });

    insertAanwijzingItem({
      id: 'aanwijzing-cable-a1',
      boqAanwijzingId: 'boqa-a',
      idIhld: 'IHLD-A',
      no: 1,
      designator: 'CABLE-FO',
      volume: 60,
      total: 600,
    });
    insertAanwijzingItem({
      id: 'aanwijzing-cable-a2',
      boqAanwijzingId: 'boqa-a',
      idIhld: 'IHLD-A',
      no: 2,
      designator: 'CABLE-FO',
      volume: 40,
      total: 400,
    });
    insertAanwijzingItem({
      id: 'aanwijzing-odp-a',
      boqAanwijzingId: 'boqa-a',
      idIhld: 'IHLD-A',
      no: 3,
      designator: 'ODP',
      volume: 10,
      total: 500,
    });
    insertUtItem({
      id: 'ut-cable-a1',
      boqUtId: 'ut-a',
      idIhld: 'IHLD-A',
      no: 1,
      designator: 'CABLE-FO',
      volume: 35,
      total: 350,
    });
    insertUtItem({
      id: 'ut-cable-a2',
      boqUtId: 'ut-a',
      idIhld: 'IHLD-A',
      no: 2,
      designator: 'CABLE-FO',
      volume: 35,
      total: 350,
    });
    insertUtItem({
      id: 'ut-splitter-a',
      boqUtId: 'ut-a',
      idIhld: 'IHLD-A',
      no: 99,
      designator: 'SPLITTER',
      volume: 5,
      total: 50,
    });

    const tracking = BoqRepository.getTrackingByProject('IHLD-A');

    expect(tracking).toEqual([
      {
        designator: 'CABLE-FO',
        aanwijzing_vol: 100,
        aanwijzing_cost: 1000,
        ut_vol: 70,
        ut_cost: 700,
        remaining_vol: 30,
        remaining_cost: 300,
      },
      {
        designator: 'ODP',
        aanwijzing_vol: 10,
        aanwijzing_cost: 500,
        ut_vol: 0,
        ut_cost: 0,
        remaining_vol: 10,
        remaining_cost: 500,
      },
      {
        designator: 'SPLITTER',
        aanwijzing_vol: 0,
        aanwijzing_cost: 0,
        ut_vol: 5,
        ut_cost: 50,
        remaining_vol: -5,
        remaining_cost: -50,
      },
    ]);
  });
});
