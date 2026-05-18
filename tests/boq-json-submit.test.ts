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
