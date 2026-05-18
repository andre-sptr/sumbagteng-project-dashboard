import { db } from '../lib/db';
import type { AllocationRow } from '@/lib/topology-allocation';

export interface TopologyAllocation {
  id: number;
  aanwijzing_id: string;
  nama_lop: string;
  id_ihld: string;
  area: string;
  sto: string;
  olt_name: string;
  odc_name: string;
  frame: number;
  slot: number;
  port: number;
  port_str: string;
  created_at: string;
  updated_at: string;
}

export interface AllocationConflict {
  source: 'master' | 'allocation';
  aanwijzing_id?: string;
  olt_name: string;
  frame: number;
  slot: number;
  port: number;
  port_str: string;
  odc_name: string;
}

export class TopologyAllocationRepository {
  static findAll(): TopologyAllocation[] {
    return db.prepare(`
      SELECT *
      FROM topology_allocations
      ORDER BY area, sto, olt_name, slot, port
    `).all() as TopologyAllocation[];
  }

  static findExistingConflicts(rows: AllocationRow[], currentAanwijzingId: string): AllocationConflict[] {
    const conflicts: AllocationConflict[] = [];
    const master = db.prepare(`
      SELECT odc_name
      FROM olt_odc_map
      WHERE olt_name = ? AND frame = ? AND slot = ? AND port = ?
      LIMIT 1
    `);
    const allocated = db.prepare(`
      SELECT aanwijzing_id, odc_name
      FROM topology_allocations
      WHERE olt_name = ? AND frame = ? AND slot = ? AND port = ? AND aanwijzing_id != ?
      LIMIT 1
    `);

    for (const row of rows) {
      const masterHit = master.get(row.olt_name, String(row.frame), row.slot, row.port) as { odc_name: string } | undefined;
      if (masterHit) {
        conflicts.push({
          source: 'master',
          olt_name: row.olt_name,
          frame: row.frame,
          slot: row.slot,
          port: row.port,
          port_str: row.port_str,
          odc_name: masterHit.odc_name,
        });
      }

      const allocationHit = allocated.get(row.olt_name, row.frame, row.slot, row.port, currentAanwijzingId) as
        | { aanwijzing_id: string; odc_name: string }
        | undefined;
      if (allocationHit) {
        conflicts.push({
          source: 'allocation',
          aanwijzing_id: allocationHit.aanwijzing_id,
          olt_name: row.olt_name,
          frame: row.frame,
          slot: row.slot,
          port: row.port,
          port_str: row.port_str,
          odc_name: allocationHit.odc_name,
        });
      }
    }

    return conflicts;
  }

  static replaceForAanwijzing(aanwijzingId: string, rows: AllocationRow[], overwrite: boolean) {
    const insert = db.prepare(`
      INSERT OR ${overwrite ? 'REPLACE' : 'ABORT'} INTO topology_allocations (
        aanwijzing_id, nama_lop, id_ihld, area, sto, olt_name, odc_name,
        frame, slot, port, port_str, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    db.prepare('DELETE FROM topology_allocations WHERE aanwijzing_id = ?').run(aanwijzingId);
    for (const row of rows) {
      insert.run(
        row.aanwijzing_id,
        row.nama_lop,
        row.id_ihld,
        row.area,
        row.sto,
        row.olt_name,
        row.odc_name,
        row.frame,
        row.slot,
        row.port,
        row.port_str
      );
    }
  }

  static deleteForAanwijzing(aanwijzingId: string) {
    return db.prepare('DELETE FROM topology_allocations WHERE aanwijzing_id = ?').run(aanwijzingId);
  }
}
