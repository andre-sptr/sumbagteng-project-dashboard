import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('updates existing topology map locations without duplicating rows', async () => {
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

    TopologyLocationRepository.upsert({
      entity_type: 'odc',
      entity_name: 'ODC-AMK-FQ',
      area: 'AMK',
      sto: 'AMK-01',
      latitude: -0.9482,
      longitude: 100.4183,
      source: 'field-survey',
      confidence: 'estimated',
      notes: 'Adjusted after survey',
    });

    const rows = TopologyLocationRepository.findAll();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      entity_type: 'odc',
      entity_name: 'ODC-AMK-FQ',
      area: 'AMK',
      sto: 'AMK-01',
      latitude: -0.9482,
      longitude: 100.4183,
      source: 'field-survey',
      confidence: 'estimated',
      notes: 'Adjusted after survey',
    });
  });

  it('returns locations ordered by entity type, area, sto, and entity name', async () => {
    const { TopologyLocationRepository } = await import('../src/repositories/TopologyLocationRepository');

    TopologyLocationRepository.upsert({
      entity_type: 'odc',
      entity_name: 'ODC-B',
      area: 'BTM',
      sto: 'BTM-02',
      latitude: -0.9,
      longitude: 100.4,
    });
    TopologyLocationRepository.upsert({
      entity_type: 'area',
      entity_name: 'AREA-Z',
      area: 'ZZZ',
      sto: '',
      latitude: -0.3,
      longitude: 100.1,
    });
    TopologyLocationRepository.upsert({
      entity_type: 'odc',
      entity_name: 'ODC-A',
      area: 'AMK',
      sto: 'AMK-01',
      latitude: -0.7,
      longitude: 100.2,
    });
    TopologyLocationRepository.upsert({
      entity_type: 'odc',
      entity_name: 'ODC-C',
      area: 'AMK',
      sto: 'AMK-01',
      latitude: -0.8,
      longitude: 100.3,
    });
    TopologyLocationRepository.upsert({
      entity_type: 'olt',
      entity_name: 'OLT-A',
      area: 'AMK',
      sto: 'AMK-01',
      latitude: -0.6,
      longitude: 100.5,
    });

    expect(
      TopologyLocationRepository.findAll().map(({ entity_type, area, sto, entity_name }) => ({
        entity_type,
        area,
        sto,
        entity_name,
      }))
    ).toEqual([
      { entity_type: 'area', area: 'ZZZ', sto: '', entity_name: 'AREA-Z' },
      { entity_type: 'odc', area: 'AMK', sto: 'AMK-01', entity_name: 'ODC-A' },
      { entity_type: 'odc', area: 'AMK', sto: 'AMK-01', entity_name: 'ODC-C' },
      { entity_type: 'odc', area: 'BTM', sto: 'BTM-02', entity_name: 'ODC-B' },
      { entity_type: 'olt', area: 'AMK', sto: 'AMK-01', entity_name: 'OLT-A' },
    ]);
  });

  it('uses repository defaults when optional fields are omitted', async () => {
    const { TopologyLocationRepository } = await import('../src/repositories/TopologyLocationRepository');

    TopologyLocationRepository.upsert({
      entity_type: 'core',
      entity_name: 'CORE-SITE',
      latitude: -0.5,
      longitude: 100.6,
    });

    expect(TopologyLocationRepository.findAll()[0]).toMatchObject({
      entity_type: 'core',
      entity_name: 'CORE-SITE',
      area: '',
      sto: '',
      latitude: -0.5,
      longitude: 100.6,
      source: 'manual',
      confidence: 'verified',
      notes: '',
    });
  });

  it('creates topology location row columns as non-null where the row type requires strings', () => {
    const tableInfo = state.db.pragma('table_info(topology_locations)') as {
      name: string;
      notnull: 0 | 1;
    }[];
    const columnsByName = new Map(tableInfo.map((column) => [column.name, column]));
    const nonNullColumns = [
      'entity_type',
      'entity_name',
      'area',
      'sto',
      'latitude',
      'longitude',
      'source',
      'confidence',
      'notes',
      'created_at',
      'updated_at',
    ];

    expect(
      nonNullColumns.map((name) => ({
        name,
        notnull: columnsByName.get(name)?.notnull,
      }))
    ).toEqual(nonNullColumns.map((name) => ({ name, notnull: 1 })));
  });
});

import type { TopologyHierarchy } from '../src/lib/topology';
import type { TopologyLocation } from '../src/types/database';
import { buildTopologyMapContext } from '../src/lib/topology-map';

const sampleTopology: TopologyHierarchy = {
  AMK: {
    'AMK-01': {
      'GPON00-D1-AMK-2': {
        name: 'GPON00-D1-AMK-2',
        type: 'OLT',
        oltType: 'big',
        portBase: 0,
        status: 'LIVE',
        plannedPorts: 16,
        realizedPorts: 2,
        maxSlot: 17,
        slots: [
          {
            slot: 1,
            frame: '1',
            maxPort: 15,
            ports: [
              null,
              {
                port: 1,
                odc_name: 'ODC-AMK-FQ',
                port_str: '1/1/1',
                source: 'master',
              },
              {
                port: 2,
                odc_name: 'ODC-AMK-FQ',
                port_str: '1/1/2',
                source: 'allocation',
                id_ihld: 'IHLD-2408',
                nama_lop: 'RKP AMK FQ',
              },
            ],
          },
        ],
      },
    },
  },
};

const sampleLocations: TopologyLocation[] = [
  {
    id: 1,
    entity_type: 'core',
    entity_name: 'SUMBAGTENG',
    area: '',
    sto: '',
    latitude: -0.9471,
    longitude: 100.4172,
    source: 'manual',
    confidence: 'verified',
    notes: '',
    created_at: '2026-05-25',
    updated_at: '2026-05-25',
  },
  {
    id: 2,
    entity_type: 'sto',
    entity_name: 'AMK-01',
    area: 'AMK',
    sto: 'AMK-01',
    latitude: -0.95,
    longitude: 100.42,
    source: 'manual',
    confidence: 'verified',
    notes: '',
    created_at: '2026-05-25',
    updated_at: '2026-05-25',
  },
  {
    id: 3,
    entity_type: 'olt',
    entity_name: 'GPON00-D1-AMK-2',
    area: 'AMK',
    sto: 'AMK-01',
    latitude: -0.951,
    longitude: 100.421,
    source: 'manual',
    confidence: 'verified',
    notes: '',
    created_at: '2026-05-25',
    updated_at: '2026-05-25',
  },
  {
    id: 4,
    entity_type: 'odc',
    entity_name: 'ODC-AMK-FQ',
    area: 'AMK',
    sto: 'AMK-01',
    latitude: -0.952,
    longitude: 100.423,
    source: 'manual',
    confidence: 'verified',
    notes: '',
    created_at: '2026-05-25',
    updated_at: '2026-05-25',
  },
];

describe('buildTopologyMapContext', () => {
  it('builds map nodes, traces, and missing-location summaries from topology data', () => {
    const context = buildTopologyMapContext(sampleTopology, sampleLocations, 'ODC-AMK-FQ');

    expect(context.nodes.map(node => `${node.entityType}:${node.name}`)).toEqual([
      'core:SUMBAGTENG',
      'sto:AMK-01',
      'olt:GPON00-D1-AMK-2',
      'odc:ODC-AMK-FQ',
    ]);
    expect(context.traces).toHaveLength(2);
    expect(context.traces[0]).toMatchObject({
      area: 'AMK',
      sto: 'AMK-01',
      oltName: 'GPON00-D1-AMK-2',
      odcName: 'ODC-AMK-FQ',
      source: 'master',
      portStr: '1/1/1',
    });
    expect(context.traces[1]).toMatchObject({
      area: 'AMK',
      sto: 'AMK-01',
      oltName: 'GPON00-D1-AMK-2',
      odcName: 'ODC-AMK-FQ',
      source: 'allocation',
      portStr: '1/1/2',
      idIhld: 'IHLD-2408',
    });
    expect(context.missingLocations).toEqual([]);
  });

  it('does not create fake markers when location metadata is missing', () => {
    const context = buildTopologyMapContext(sampleTopology, [], 'ODC-AMK-FQ');

    expect(context.nodes).toEqual([]);
    expect(context.traces).toEqual([]);
    expect(context.missingLocations).toEqual([
      { entityType: 'core', name: 'SUMBAGTENG', area: '', sto: '' },
      { entityType: 'sto', name: 'AMK-01', area: 'AMK', sto: 'AMK-01' },
      { entityType: 'olt', name: 'GPON00-D1-AMK-2', area: 'AMK', sto: 'AMK-01' },
      { entityType: 'odc', name: 'ODC-AMK-FQ', area: 'AMK', sto: 'AMK-01' },
    ]);
  });
});

describe('seedTopologyLocations', () => {
  const seedFilePath = path.join(process.cwd(), 'data', 'topology-locations.json');
  let originalSeedFileContent: string | null = null;

  beforeEach(async () => {
    await setupDb();
    originalSeedFileContent = fs.existsSync(seedFilePath)
      ? fs.readFileSync(seedFilePath, 'utf8')
      : null;
  });

  afterEach(() => {
    if (originalSeedFileContent === null) {
      if (fs.existsSync(seedFilePath)) fs.unlinkSync(seedFilePath);
      return;
    }

    fs.writeFileSync(seedFilePath, originalSeedFileContent);
  });

  it('seeds topology locations from JSON rows', async () => {
    const { seedTopologyLocationsFromRows } = await import('../src/lib/seed-topology-locations');
    const { TopologyLocationRepository } = await import('../src/repositories/TopologyLocationRepository');

    seedTopologyLocationsFromRows([
      {
        entity_type: 'core',
        entity_name: 'SUMBAGTENG',
        latitude: -0.9471,
        longitude: 100.4172,
        confidence: 'verified',
      },
    ]);

    expect(TopologyLocationRepository.findAll()).toMatchObject([
      {
        entity_type: 'core',
        entity_name: 'SUMBAGTENG',
        latitude: -0.9471,
        longitude: 100.4172,
        source: 'seed',
        confidence: 'verified',
      },
    ]);
  });

  it('seeds topology locations from compact coordinate fields', async () => {
    const { seedTopologyLocationsFromRows } = await import('../src/lib/seed-topology-locations');
    const { TopologyLocationRepository } = await import('../src/repositories/TopologyLocationRepository');

    seedTopologyLocationsFromRows([
      {
        entity_type: 'sto',
        entity_name: 'AMK-01',
        lat: -0.95,
        lng: 100.42,
        source: 'seed',
        confidence: 'verified',
      },
    ]);

    expect(TopologyLocationRepository.findAll()).toMatchObject([
      {
        entity_type: 'sto',
        entity_name: 'AMK-01',
        latitude: -0.95,
        longitude: 100.42,
        source: 'seed',
        confidence: 'verified',
      },
    ]);
  });

  it.each([
    ['blank', ''],
    ['malformed', '{ nope'],
    ['non-array', '{"entity_type":"core"}'],
  ])('skips %s optional seed file input', async (_caseName, seedContent) => {
    const { seedTopologyLocationsIfPresent } = await import('../src/lib/seed-topology-locations');
    const { TopologyLocationRepository } = await import('../src/repositories/TopologyLocationRepository');

    fs.writeFileSync(seedFilePath, seedContent);

    expect(() => seedTopologyLocationsIfPresent()).not.toThrow();
    expect(TopologyLocationRepository.findAll()).toEqual([]);
  });

  it('skips structurally invalid seed rows and keeps valid rows', async () => {
    const { seedTopologyLocationsFromRows } = await import('../src/lib/seed-topology-locations');
    const { TopologyLocationRepository } = await import('../src/repositories/TopologyLocationRepository');

    seedTopologyLocationsFromRows([
      null,
      'not-an-object',
      {
        entity_type: 'invalid',
        entity_name: 'CORE-BAD',
        latitude: -0.1,
        longitude: 100.1,
      },
      {
        entity_type: 'core',
        entity_name: 'CORE-BAD-CONFIDENCE',
        latitude: -0.2,
        longitude: 100.2,
        confidence: 'unknown',
      },
      {
        entity_type: 'core',
        entity_name: 'CORE-GOOD',
        latitude: -0.3,
        longitude: 100.3,
        confidence: 'estimated',
      },
    ]);

    expect(TopologyLocationRepository.findAll()).toMatchObject([
      {
        entity_type: 'core',
        entity_name: 'CORE-GOOD',
        latitude: -0.3,
        longitude: 100.3,
        confidence: 'estimated',
      },
    ]);
  });

  it('does not overwrite an existing manual location when seed data is present', async () => {
    const { seedTopologyLocationsFromRows } = await import('../src/lib/seed-topology-locations');
    const { TopologyLocationRepository } = await import('../src/repositories/TopologyLocationRepository');

    TopologyLocationRepository.upsert({
      entity_type: 'odc',
      entity_name: 'ODC-AMK-FQ',
      area: 'AMK',
      sto: 'AMK-01',
      latitude: -0.952,
      longitude: 100.423,
      source: 'manual',
      confidence: 'verified',
      notes: 'Manual field coordinate',
    });

    seedTopologyLocationsFromRows([
      {
        entity_type: 'odc',
        entity_name: 'ODC-AMK-FQ',
        area: 'AMK',
        sto: 'AMK-01',
        latitude: -0.1,
        longitude: 100.1,
        source: 'seed',
        confidence: 'estimated',
        notes: 'Seed coordinate',
      },
    ]);

    expect(TopologyLocationRepository.findAll()).toMatchObject([
      {
        entity_type: 'odc',
        entity_name: 'ODC-AMK-FQ',
        area: 'AMK',
        sto: 'AMK-01',
        latitude: -0.952,
        longitude: 100.423,
        source: 'manual',
        confidence: 'verified',
        notes: 'Manual field coordinate',
      },
    ]);
  });
});
