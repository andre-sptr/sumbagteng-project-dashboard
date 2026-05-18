import { db } from '../lib/db';

export interface OltOdcRow {
  id: number;
  area: string;
  sto: string;
  olt_name: string;
  odc_name: string;
  port_str: string;
  frame: string;
  slot: number;
  port: number;
}

export class OltOdcRepository {
  static isEmpty(): boolean {
    const row = db.prepare('SELECT 1 FROM olt_odc_map LIMIT 1').get();
    return row === undefined;
  }

  static findAll(): OltOdcRow[] {
    return db.prepare(
      'SELECT id, area, sto, olt_name, odc_name, port_str, frame, slot, port FROM olt_odc_map ORDER BY area, sto, olt_name, slot, port'
    ).all() as OltOdcRow[];
  }

  static getDistinctOdcNames(): string[] {
    return db.prepare(`
      SELECT DISTINCT odc_name
      FROM olt_odc_map
      WHERE odc_name != ''
      ORDER BY odc_name
    `).all().map((row) => (row as { odc_name: string }).odc_name);
  }

  static getOlts(area?: string, sto?: string): { area: string; sto: string; olt_name: string }[] {
    if (area && sto) {
      return db.prepare(`
        SELECT DISTINCT area, sto, olt_name
        FROM olt_odc_map
        WHERE area = ? AND sto = ?
        ORDER BY olt_name
      `).all(area, sto) as { area: string; sto: string; olt_name: string }[];
    }

    return db.prepare(`
      SELECT DISTINCT area, sto, olt_name
      FROM olt_odc_map
      ORDER BY area, sto, olt_name
    `).all() as { area: string; sto: string; olt_name: string }[];
  }

  static bulkInsert(rows: Omit<OltOdcRow, 'id'>[]): void {
    if (rows.length === 0) return;
    const insert = db.prepare(
      'INSERT OR IGNORE INTO olt_odc_map (area, sto, olt_name, odc_name, port_str, frame, slot, port) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    db.transaction(() => {
      for (const row of rows) {
        insert.run(row.area, row.sto, row.olt_name, row.odc_name, row.port_str, row.frame, row.slot, row.port);
      }
    })();
  }
}
