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

describe('TopologyLocationRepository', () => {
  beforeEach(async () => {
    await setupDb();
  });

  it('stores and returns verified topology map locations ordered by entity type and name', async () => {
    const { TopologyLocationRepository } = await import('../src/repositories/TopologyLocationRepository');

    TopologyLocationRepository.upsert({
      entity_type: 'odc',
      entity_name: 'ODC-AMK-FQ',
      area: 'AMK',
      sto: 'AMK-01',
      latitude: -0.9471,
      longitude: 100.4172,
      source: 'manual',
      confidence: 'verified',
      notes: 'Verified from field data',
    });

    const rows = TopologyLocationRepository.findAll();

    expect(rows).toMatchObject([
      {
        entity_type: 'odc',
        entity_name: 'ODC-AMK-FQ',
        area: 'AMK',
        sto: 'AMK-01',
        latitude: -0.9471,
        longitude: 100.4172,
        source: 'manual',
        confidence: 'verified',
      },
    ]);
  });
});
