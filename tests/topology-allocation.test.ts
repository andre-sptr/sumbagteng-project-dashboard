import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeSchema } from '../src/lib/schema';
import { buildPortAllocations, detectOdcName } from '../src/lib/topology-allocation';

const state = vi.hoisted(() => ({
  db: null as unknown as Database.Database,
}));

vi.mock('../src/lib/db', () => ({
  get db() {
    return state.db;
  },
}));

vi.mock('@/lib/db', () => ({
  get db() {
    return state.db;
  },
}));

async function setupDb() {
  vi.resetModules();
  state.db = new Database(':memory:');
  state.db.pragma('foreign_keys = ON');
  initializeSchema(state.db);
}

describe('topology allocation helpers', () => {
  it('builds one allocation per slot and port using frame/slot/port string format', () => {
    const rows = buildPortAllocations({
      aanwijzing_id: 'AAN-1',
      nama_lop: 'RKP TSEL PT3 LBJ-FAN BUGIS JUNCTION',
      id_ihld: 'IHLD-1',
      area: 'RIKEP',
      sto: 'LBJ',
      olt_name: 'OLT-LBJ-1',
      odc_name: 'LBJ-FAN',
      frame: 1,
      slot_awal: 1,
      slot_akhir: 2,
      port_awal: 0,
      port_akhir: 1,
    });

    expect(rows.map(r => r.port_str)).toEqual(['1/1/0', '1/1/1', '1/2/0', '1/2/1']);
  });

  it('detects the longest ODC match from nama_lop using hyphen and space tolerant matching', () => {
    const detected = detectOdcName('RDR JPP PT3 EXPAND ARK FKF', ['ARK-FK', 'ARK-FKF']);
    expect(detected).toBe('ARK-FKF');
  });
});

describe('topology allocation repository', () => {
  beforeEach(async () => {
    await setupDb();
  });

  it('detects master conflicts and allocation conflicts separately', async () => {
    const { TopologyAllocationRepository } = await import('../src/repositories/TopologyAllocationRepository');
    const rows = buildPortAllocations({
      aanwijzing_id: 'AAN-NEW',
      nama_lop: 'RKP TSEL PT3 LBJ-FAN BUGIS JUNCTION',
      id_ihld: 'IHLD-NEW',
      area: 'RIKEP',
      sto: 'LBJ',
      olt_name: 'OLT-LBJ-1',
      odc_name: 'LBJ-FAN',
      frame: 1,
      slot_awal: 1,
      slot_akhir: 1,
      port_awal: 0,
      port_akhir: 1,
    });

    state.db.prepare(`
      INSERT INTO olt_odc_map (area, sto, olt_name, odc_name, port_str, frame, slot, port)
      VALUES ('RIKEP', 'LBJ', 'OLT-LBJ-1', 'MASTER-ODC', '1/1/0', '1', 1, 0)
    `).run();
    state.db.prepare(`
      INSERT INTO aanwijzing (id, nama_lop, id_ihld, tanggal_aanwijzing)
      VALUES ('AAN-OLD', 'OLD LOP', 'IHLD-OLD', '2026-05-18')
    `).run();
    state.db.prepare(`
      INSERT INTO topology_allocations (
        aanwijzing_id, nama_lop, id_ihld, area, sto, olt_name, odc_name, frame, slot, port, port_str
      ) VALUES ('AAN-OLD', 'OLD LOP', 'IHLD-OLD', 'RIKEP', 'LBJ', 'OLT-LBJ-1', 'ALLOC-ODC', 1, 1, 1, '1/1/1')
    `).run();

    const conflicts = TopologyAllocationRepository.findExistingConflicts(rows, 'AAN-NEW');

    expect(conflicts.map(c => c.source)).toEqual(['master', 'allocation']);
  });
});
