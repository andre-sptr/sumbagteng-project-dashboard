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
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  source?: string;
  confidence?: TopologyLocationConfidence;
  notes?: string;
}

interface ResolvedSeedCoordinates {
  latitude: number;
  longitude: number;
}

const VALID_ENTITY_TYPES = new Set<TopologyLocationEntityType>([
  'core',
  'area',
  'sto',
  'olt',
  'odc',
]);

const VALID_CONFIDENCES = new Set<TopologyLocationConfidence>([
  'verified',
  'estimated',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeEntityType(value: unknown): TopologyLocationEntityType | null {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase();
  return VALID_ENTITY_TYPES.has(normalized as TopologyLocationEntityType)
    ? normalized as TopologyLocationEntityType
    : null;
}

function normalizeConfidence(value: unknown): TopologyLocationConfidence | null {
  if (value === undefined) return 'verified';
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase();
  return VALID_CONFIDENCES.has(normalized as TopologyLocationConfidence)
    ? normalized as TopologyLocationConfidence
    : null;
}

function optionalString(value: unknown): string | null {
  if (value === undefined) return '';
  return typeof value === 'string' ? value : null;
}

function requiredString(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function resolveSeedCoordinates(row: Pick<SeedTopologyLocationRow, 'latitude' | 'longitude' | 'lat' | 'lng'>) {
  return {
    latitude: row.latitude ?? row.lat,
    longitude: row.longitude ?? row.lng,
  };
}

function hasValidSeedCoordinates(
  coordinates: ReturnType<typeof resolveSeedCoordinates>
): coordinates is ResolvedSeedCoordinates {
  return Number.isFinite(coordinates.latitude)
    && Number.isFinite(coordinates.longitude);
}

function isValidSeedRow(
  row: SeedTopologyLocationRow,
  coordinates: ReturnType<typeof resolveSeedCoordinates>
): coordinates is ResolvedSeedCoordinates {
  return Boolean(row.entity_type)
    && Boolean(row.entity_name)
    && hasValidSeedCoordinates(coordinates);
}

function normalizeSeedRow(row: unknown): SeedTopologyLocationRow | null {
  if (!isRecord(row)) return null;

  const entityType = normalizeEntityType(row.entity_type);
  const entityName = requiredString(row.entity_name);
  const confidence = normalizeConfidence(row.confidence);
  const area = optionalString(row.area);
  const sto = optionalString(row.sto);
  const source = optionalString(row.source);
  const notes = optionalString(row.notes);

  if (
    !entityType
    || !entityName
    || !confidence
    || area === null
    || sto === null
    || source === null
    || notes === null
  ) {
    return null;
  }

  return {
    entity_type: entityType,
    entity_name: entityName,
    area,
    sto,
    latitude: optionalNumber(row.latitude),
    longitude: optionalNumber(row.longitude),
    lat: optionalNumber(row.lat),
    lng: optionalNumber(row.lng),
    source: source || undefined,
    confidence,
    notes,
  };
}

export function seedTopologyLocationsFromRows(rows: unknown) {
  if (!Array.isArray(rows)) return;

  for (const row of rows) {
    const seedRow = normalizeSeedRow(row);
    if (!seedRow) continue;

    const coordinates = resolveSeedCoordinates(seedRow);
    if (!isValidSeedRow(seedRow, coordinates)) continue;

    TopologyLocationRepository.insertIfMissing({
      entity_type: seedRow.entity_type,
      entity_name: seedRow.entity_name,
      area: seedRow.area ?? '',
      sto: seedRow.sto ?? '',
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      source: seedRow.source ?? 'seed',
      confidence: seedRow.confidence ?? 'verified',
      notes: seedRow.notes ?? '',
    });
  }
}

export function seedTopologyLocationsIfPresent() {
  const filePath = path.join(process.cwd(), 'data', 'topology-locations.json');
  if (!fs.existsSync(filePath)) return;

  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw.trim()) return;

  let rows: unknown;
  try {
    rows = JSON.parse(raw);
  } catch {
    return;
  }

  seedTopologyLocationsFromRows(rows);
}
