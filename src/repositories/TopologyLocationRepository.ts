import { db } from '@/lib/db';
import type {
  TopologyLocation,
  TopologyLocationConfidence,
  TopologyLocationEntityType,
} from '@/types/database';

export interface TopologyLocationInput {
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

export class TopologyLocationRepository {
  static findAll(): TopologyLocation[] {
    return db.prepare(`
      SELECT id, entity_type, entity_name, area, sto, latitude, longitude,
             source, confidence, notes, created_at, updated_at
      FROM topology_locations
      ORDER BY entity_type, area, sto, entity_name
    `).all() as TopologyLocation[];
  }

  static upsert(input: TopologyLocationInput): void {
    db.prepare(`
      INSERT INTO topology_locations (
        entity_type, entity_name, area, sto, latitude, longitude, source, confidence, notes, updated_at
      ) VALUES (
        @entity_type, @entity_name, @area, @sto, @latitude, @longitude, @source, @confidence, @notes, CURRENT_TIMESTAMP
      )
      ON CONFLICT(entity_type, entity_name, area, sto) DO UPDATE SET
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        source = excluded.source,
        confidence = excluded.confidence,
        notes = excluded.notes,
        updated_at = CURRENT_TIMESTAMP
    `).run({
      entity_type: input.entity_type,
      entity_name: input.entity_name,
      area: input.area ?? '',
      sto: input.sto ?? '',
      latitude: input.latitude,
      longitude: input.longitude,
      source: input.source ?? 'manual',
      confidence: input.confidence ?? 'verified',
      notes: input.notes ?? '',
    });
  }

  static insertIfMissing(input: TopologyLocationInput): void {
    db.prepare(`
      INSERT INTO topology_locations (
        entity_type, entity_name, area, sto, latitude, longitude, source, confidence, notes, updated_at
      ) VALUES (
        @entity_type, @entity_name, @area, @sto, @latitude, @longitude, @source, @confidence, @notes, CURRENT_TIMESTAMP
      )
      ON CONFLICT(entity_type, entity_name, area, sto) DO NOTHING
    `).run({
      entity_type: input.entity_type,
      entity_name: input.entity_name,
      area: input.area ?? '',
      sto: input.sto ?? '',
      latitude: input.latitude,
      longitude: input.longitude,
      source: input.source ?? 'manual',
      confidence: input.confidence ?? 'verified',
      notes: input.notes ?? '',
    });
  }
}
