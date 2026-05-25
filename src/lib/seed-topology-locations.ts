import fs from 'fs';
import path from 'path';
import type {
  TopologyLocationConfidence,
  TopologyLocationEntityType,
} from '@/types/database';
import { TopologyLocationRepository } from '@/repositories/TopologyLocationRepository';

interface SeedTopologyLocationRow {
  entity_type: TopologyLocationEntityType;
  entity_name: string;
  area?: string;
  sto?: string;
  latitude: number;
  longitude: number;
  source?: string;
  confidence?: TopologyLocationConfidence;
  notes?: string;
}

function isValidSeedRow(row: SeedTopologyLocationRow) {
  return Boolean(row.entity_type)
    && Boolean(row.entity_name)
    && Number.isFinite(row.latitude)
    && Number.isFinite(row.longitude);
}

export function seedTopologyLocationsFromRows(rows: SeedTopologyLocationRow[]) {
  for (const row of rows) {
    if (!isValidSeedRow(row)) continue;
    TopologyLocationRepository.upsert({
      entity_type: row.entity_type,
      entity_name: row.entity_name,
      area: row.area ?? '',
      sto: row.sto ?? '',
      latitude: row.latitude,
      longitude: row.longitude,
      source: row.source ?? 'seed',
      confidence: row.confidence ?? 'verified',
      notes: row.notes ?? '',
    });
  }
}

export function seedTopologyLocationsIfPresent() {
  const filePath = path.join(process.cwd(), 'data', 'topology-locations.json');
  if (!fs.existsSync(filePath)) return;

  const raw = fs.readFileSync(filePath, 'utf8');
  const rows = JSON.parse(raw) as SeedTopologyLocationRow[];
  seedTopologyLocationsFromRows(rows);
}
