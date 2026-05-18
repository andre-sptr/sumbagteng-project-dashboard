import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeSchema } from '../src/lib/schema';
import type { BoqItem } from '../src/lib/excel';

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

const boqItem: BoqItem = {
  no: 1,
  is_section: false,
  designator: 'OS-SM-1',
  uraian_pekerjaan: 'Penyambungan Kabel Optik',
  satuan: 'Core',
  harga_satuan_material: 0,
  harga_satuan_jasa: 49440,
  volume: 27,
  total_material: 0,
  total_jasa: 1334880,
  total: 1334880,
  keterangan: '',
};

describe('BoQ JSON submit routes', () => {
  beforeEach(async () => {
    await setupDb();
  });

  it('stores AANWIJZING BoQ rows in normalized items when submitted from the form', async () => {
    const { POST } = await import('../src/app/api/aanwijzing/route');

    const response = await POST(new Request('http://localhost/api/aanwijzing', {
      method: 'POST',
      body: JSON.stringify({
        nama_lop: 'LOP A',
        id_ihld: 'IHLD-A',
        tanggal_aanwijzing: '2026-05-18',
        id: null,
        boq_data: [boqItem],
      }),
    }) as never);

    expect(response.status).toBe(200);
    expect(
      state.db.prepare('SELECT COUNT(*) AS count FROM boq_aanwijzing_items').get()
    ).toEqual({ count: 1 });
    expect(
      state.db.prepare('SELECT designator, volume, total FROM boq_aanwijzing_items').get()
    ).toEqual({ designator: 'OS-SM-1', volume: 27, total: 1334880 });

    const stored = state.db
      .prepare('SELECT full_data FROM boq_aanwijzing')
      .get() as { full_data: string };
    expect(JSON.parse(stored.full_data)[0].designator).toBe('OS-SM-1');
  });

  it('rejects AANWIJZING topology allocation when the selected port exists in master topology', async () => {
    const { POST } = await import('../src/app/api/aanwijzing/route');

    state.db.prepare(`
      INSERT INTO olt_odc_map (area, sto, olt_name, odc_name, port_str, frame, slot, port)
      VALUES ('RIKEP', 'LBJ', 'OLT-LBJ-1', 'MASTER-ODC', '1/1/0', '1', 1, 0)
    `).run();

    const response = await POST(new Request('http://localhost/api/aanwijzing', {
      method: 'POST',
      body: JSON.stringify({
        nama_lop: 'RKP TSEL PT3 LBJ-FAN BUGIS JUNCTION',
        id_ihld: 'IHLD-A',
        tanggal_aanwijzing: '2026-05-18',
        area: 'RIKEP',
        sto: 'LBJ',
        gpon: 'OLT-LBJ-1',
        odc_name: 'LBJ-FAN',
        frame: 1,
        slot_awal: 1,
        slot_akhir: 1,
        port_awal: 0,
        port_akhir: 0,
      }),
    }) as never);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.details.code).toBe('TOPOLOGY_MASTER_CONFLICT');
    expect(
      state.db.prepare('SELECT COUNT(*) AS count FROM aanwijzing').get()
    ).toEqual({ count: 0 });
  });

  it('requires overwrite for conflicts with another AANWIJZING allocation and replaces it when allowed', async () => {
    const { POST } = await import('../src/app/api/aanwijzing/route');

    state.db.prepare(`
      INSERT INTO aanwijzing (id, nama_lop, id_ihld, tanggal_aanwijzing, area, sto, odc_name)
      VALUES ('AAN-OLD', 'OLD LOP', 'IHLD-OLD', '2026-05-17', 'RIKEP', 'LBJ', 'OLD-ODC')
    `).run();
    state.db.prepare(`
      INSERT INTO topology_allocations (
        aanwijzing_id, nama_lop, id_ihld, area, sto, olt_name, odc_name, frame, slot, port, port_str
      ) VALUES ('AAN-OLD', 'OLD LOP', 'IHLD-OLD', 'RIKEP', 'LBJ', 'OLT-LBJ-1', 'OLD-ODC', 1, 1, 1, '1/1/1')
    `).run();

    const payload = {
      nama_lop: 'RKP TSEL PT3 LBJ-FAN BUGIS JUNCTION',
      id_ihld: 'IHLD-NEW',
      tanggal_aanwijzing: '2026-05-18',
      area: 'RIKEP',
      sto: 'LBJ',
      gpon: 'OLT-LBJ-1',
      odc_name: 'LBJ-FAN',
      frame: 1,
      slot_awal: 1,
      slot_akhir: 1,
      port_awal: 1,
      port_akhir: 1,
    };

    const blocked = await POST(new Request('http://localhost/api/aanwijzing', {
      method: 'POST',
      body: JSON.stringify(payload),
    }) as never);
    const blockedBody = await blocked.json();

    expect(blocked.status).toBe(409);
    expect(blockedBody.details.code).toBe('TOPOLOGY_ALLOCATION_CONFLICT');

    const overwritten = await POST(new Request('http://localhost/api/aanwijzing', {
      method: 'POST',
      body: JSON.stringify({ ...payload, allow_overwrite: true }),
    }) as never);

    expect(overwritten.status).toBe(200);
    expect(
      state.db.prepare('SELECT odc_name, id_ihld FROM topology_allocations WHERE olt_name = ? AND slot = ? AND port = ?')
        .get('OLT-LBJ-1', 1, 1)
    ).toEqual({ odc_name: 'LBJ-FAN', id_ihld: 'IHLD-NEW' });
  });

  it('stores UT BoQ rows in normalized items when submitted from the form', async () => {
    const { POST } = await import('../src/app/api/ut/route');

    const response = await POST(new Request('http://localhost/api/ut', {
      method: 'POST',
      body: JSON.stringify({
        nama_lop: 'LOP A',
        id_ihld: 'IHLD-A',
        tanggal_ct_ut: '2026-05-18',
        id: null,
        boq_data: [boqItem],
      }),
    }) as never);

    expect(response.status).toBe(200);
    expect(
      state.db.prepare('SELECT COUNT(*) AS count FROM boq_ut_items').get()
    ).toEqual({ count: 1 });
    expect(
      state.db.prepare('SELECT designator, volume, total FROM boq_ut_items').get()
    ).toEqual({ designator: 'OS-SM-1', volume: 27, total: 1334880 });

    const stored = state.db
      .prepare('SELECT full_data FROM boq_ut')
      .get() as { full_data: string };
    expect(JSON.parse(stored.full_data)[0].designator).toBe('OS-SM-1');
  });
});
