import { db } from '../lib/db';
import type { BoqItem } from '../lib/excel';

export interface Boq {
  id: string;
  nama_lop: string;
  id_ihld: string;
  sto: string;
  project_name: string;
  full_data: string;
  project_uid: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrackingGlobalRow {
  designator: string;
  jumlah_project: number;
  aanwijzing_vol: number;
  aanwijzing_cost: number;
  ut_vol: number;
  ut_cost: number;
  remaining_vol: number;
  remaining_cost: number;
}

export interface TrackingProjectRow {
  designator: string;
  aanwijzing_vol: number;
  aanwijzing_cost: number;
  ut_vol: number;
  ut_cost: number;
  remaining_vol: number;
  remaining_cost: number;
}

export interface SelisihAanwijzingSummaryRow {
  branch_fmc: string;
  port_plan: number;
  boq_plan: number;
  cpp_plan: number;
  port_aanwijzing: number;
  boq_aanwijzing: number;
  cpp_aanwijzing: number;
  kenaikan_boq: number;
  persen_kenaikan: number;
}

export interface CheckBoqDbRow {
  designator: string;
  volume: number;
  total: number;
}

export class BoqRepository {
  static findAll(): Boq[] {
    return db.prepare('SELECT * FROM boq ORDER BY created_at DESC').all() as Boq[];
  }

  static findById(id: string): Boq | undefined {
    return db.prepare('SELECT * FROM boq WHERE id = ?').get(id) as Boq | undefined;
  }

  static delete(id: string) {
    return db.prepare('DELETE FROM boq WHERE id = ?').run(id);
  }

  static upsert(data: Omit<Boq, 'created_at' | 'updated_at'>) {
    return db.prepare(`
      INSERT INTO boq (
        id, nama_lop, id_ihld, sto, project_name, full_data, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        nama_lop = excluded.nama_lop,
        id_ihld = excluded.id_ihld,
        sto = excluded.sto,
        project_name = excluded.project_name,
        full_data = excluded.full_data,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      data.id, data.nama_lop, data.id_ihld, data.sto, data.project_name, data.full_data
    );
  }

  static upsertWithItems(
    data: { nama_lop: string; id_ihld: string; project_uid: string },
    items: BoqItem[]
  ): string {
    const txn = db.transaction((): string => {
      const fullData = JSON.stringify(items);
      const existing = db.prepare('SELECT id FROM boq WHERE project_uid = ?')
        .get(data.project_uid) as { id: string } | undefined;

      let boqId: string;
      if (existing) {
        boqId = existing.id;
        db.prepare(
          'UPDATE boq SET nama_lop = ?, id_ihld = ?, full_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(data.nama_lop, data.id_ihld, fullData, boqId);
      } else {
        boqId = `boq_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        db.prepare(`
          INSERT INTO boq (id, nama_lop, id_ihld, sto, project_name, full_data, project_uid, created_at, updated_at)
          VALUES (?, ?, ?, '', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(boqId, data.nama_lop, data.id_ihld, data.nama_lop, fullData, data.project_uid);
      }

      db.prepare('DELETE FROM boq_plan_items WHERE boq_plan_id = ?').run(boqId);

      const insertItem = db.prepare(`
        INSERT INTO boq_plan_items (
          id, boq_plan_id, project_uid, nama_lop, id_ihld,
          no, is_section, designator, uraian_pekerjaan, satuan,
          harga_satuan_material, harga_satuan_jasa, volume,
          total_material, total_jasa, total, keterangan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const ts = Date.now();
      items.forEach((item, i) => {
        insertItem.run(
          `bpi_${ts}_${i.toString(36).padStart(4, '0')}`,
          boqId, data.project_uid, data.nama_lop, data.id_ihld,
          item.no, item.is_section ? 1 : 0, item.designator,
          item.uraian_pekerjaan, item.satuan,
          item.harga_satuan_material, item.harga_satuan_jasa, item.volume,
          item.total_material, item.total_jasa, item.total, item.keterangan
        );
      });

      return boqId;
    });

    return txn();
  }

  static getTrackingGlobal(): TrackingGlobalRow[] {
    return db.prepare(`
      WITH aanwijzing AS (
        SELECT designator,
               SUM(volume) AS aanwijzing_vol,
               SUM(total)  AS aanwijzing_cost
        FROM boq_aanwijzing_items
        WHERE is_section = 0 AND TRIM(designator) != ''
        GROUP BY designator
      ),
      ut AS (
        SELECT designator,
               SUM(volume) AS ut_vol,
               SUM(total)  AS ut_cost
        FROM boq_ut_items
        WHERE is_section = 0 AND TRIM(designator) != ''
        GROUP BY designator
      ),
      projects AS (
        SELECT designator,
               COUNT(DISTINCT id_ihld) AS jumlah_project
        FROM (
          SELECT designator, id_ihld
          FROM boq_aanwijzing_items
          WHERE is_section = 0 AND TRIM(designator) != ''
          UNION
          SELECT designator, id_ihld
          FROM boq_ut_items
          WHERE is_section = 0 AND TRIM(designator) != ''
        )
        GROUP BY designator
      ),
      designators AS (
        SELECT designator FROM aanwijzing
        UNION
        SELECT designator FROM ut
      )
      SELECT d.designator,
             COALESCE(projects.jumlah_project, 0)       AS jumlah_project,
             COALESCE(aanwijzing.aanwijzing_vol, 0)     AS aanwijzing_vol,
             COALESCE(aanwijzing.aanwijzing_cost, 0)    AS aanwijzing_cost,
             COALESCE(ut.ut_vol, 0)                     AS ut_vol,
             COALESCE(ut.ut_cost, 0)                    AS ut_cost,
             COALESCE(aanwijzing.aanwijzing_vol, 0) - COALESCE(ut.ut_vol, 0)     AS remaining_vol,
             COALESCE(aanwijzing.aanwijzing_cost, 0) - COALESCE(ut.ut_cost, 0)   AS remaining_cost
      FROM designators d
      LEFT JOIN aanwijzing ON aanwijzing.designator = d.designator
      LEFT JOIN ut ON ut.designator = d.designator
      LEFT JOIN projects ON projects.designator = d.designator
      ORDER BY ut_cost DESC, remaining_cost DESC, d.designator ASC
    `).all() as TrackingGlobalRow[];
  }

  static getTrackingByProject(idIhld: string): TrackingProjectRow[] {
    return db.prepare(`
      WITH aanwijzing AS (
        SELECT designator,
               MIN(no)      AS sort_no,
               SUM(volume)  AS aanwijzing_vol,
               SUM(total)   AS aanwijzing_cost
        FROM boq_aanwijzing_items
        WHERE id_ihld = ? AND is_section = 0 AND TRIM(designator) != ''
        GROUP BY designator
      ),
      ut AS (
        SELECT designator,
               MIN(no)      AS sort_no,
               SUM(volume)  AS ut_vol,
               SUM(total)   AS ut_cost
        FROM boq_ut_items
        WHERE id_ihld = ? AND is_section = 0 AND TRIM(designator) != ''
        GROUP BY designator
      ),
      designators AS (
        SELECT designator, MIN(sort_no) AS sort_no
        FROM (
          SELECT designator, sort_no FROM aanwijzing
          UNION ALL
          SELECT designator, sort_no FROM ut
        )
        GROUP BY designator
      )
      SELECT d.designator,
             COALESCE(aanwijzing.aanwijzing_vol, 0)     AS aanwijzing_vol,
             COALESCE(aanwijzing.aanwijzing_cost, 0)    AS aanwijzing_cost,
             COALESCE(ut.ut_vol, 0)                     AS ut_vol,
             COALESCE(ut.ut_cost, 0)                    AS ut_cost,
             COALESCE(aanwijzing.aanwijzing_vol, 0) - COALESCE(ut.ut_vol, 0)     AS remaining_vol,
             COALESCE(aanwijzing.aanwijzing_cost, 0) - COALESCE(ut.ut_cost, 0)   AS remaining_cost
      FROM designators d
      LEFT JOIN aanwijzing ON aanwijzing.designator = d.designator
      LEFT JOIN ut ON ut.designator = d.designator
      ORDER BY d.sort_no ASC, d.designator ASC
    `).all(idIhld, idIhld) as TrackingProjectRow[];
  }

  static getSelisihAanwijzingSummary(startDate?: string, endDate?: string): SelisihAanwijzingSummaryRow[] {
    interface RawSummaryRow {
      branch_fmc: string;
      port_plan: number;
      boq_plan: number;
      port_aanwijzing: number;
      boq_aanwijzing: number;
    }

    let dateCondition = "";
    const params: string[] = [];
    if (startDate && endDate) {
      dateCondition = " AND DATE(COALESCE(NULLIF(p.golive_actual, ''), p.golive_target)) >= DATE(?) AND DATE(COALESCE(NULLIF(p.golive_actual, ''), p.golive_target)) <= DATE(?)";
      params.push(startDate, endDate);
    }

    const rows = db.prepare(`
      WITH project_data AS (
        SELECT p.uid, p.id_ihld, p.branch, 
               COALESCE(p.port_planned, 0) as port_planned, 
               COALESCE(p.port_realized, 0) as port_realized
        FROM projects p
        WHERE p.branch IS NOT NULL AND TRIM(p.branch) != '' ${dateCondition}
      ),
      boq_plan AS (
        SELECT id_ihld, SUM(total) as boq_plan_total
        FROM boq_plan_items
        GROUP BY id_ihld
      ),
      boq_aanwijzing AS (
        SELECT id_ihld, SUM(total) as boq_aanwijzing_total
        FROM boq_aanwijzing_items
        GROUP BY id_ihld
      )
      SELECT 
        pd.branch as branch_fmc,
        SUM(pd.port_planned) as port_plan,
        SUM(COALESCE(bp.boq_plan_total, 0)) as boq_plan,
        SUM(pd.port_realized) as port_aanwijzing,
        SUM(COALESCE(ba.boq_aanwijzing_total, 0)) as boq_aanwijzing
      FROM project_data pd
      LEFT JOIN boq_plan bp ON bp.id_ihld = pd.id_ihld
      LEFT JOIN boq_aanwijzing ba ON ba.id_ihld = pd.id_ihld
      GROUP BY pd.branch
      ORDER BY pd.branch ASC
    `).all(...params) as RawSummaryRow[];

    return rows.map((row) => {
      const boq_plan = row.boq_plan || 0;
      const port_plan = row.port_plan || 0;
      const cpp_plan = port_plan > 0 ? boq_plan / port_plan : 0;

      const boq_aanwijzing = row.boq_aanwijzing || 0;
      const port_aanwijzing = row.port_aanwijzing || 0;
      const cpp_aanwijzing = port_aanwijzing > 0 ? boq_aanwijzing / port_aanwijzing : 0;

      const kenaikan_boq = boq_aanwijzing - boq_plan;
      const persen_kenaikan = boq_plan > 0 ? (kenaikan_boq / boq_plan) * 100 : 0;

      return {
        branch_fmc: row.branch_fmc,
        port_plan,
        boq_plan,
        cpp_plan,
        port_aanwijzing,
        boq_aanwijzing,
        cpp_aanwijzing,
        kenaikan_boq,
        persen_kenaikan,
      };
    });
  }

  /**
   * Check whether BOQ items exist for a given project (by id_ihld)
   * in the specified source table.
   */
  static hasBoqItems(idIhld: string, source: 'ut' | 'aanwijzing'): boolean {
    const table = source === 'ut' ? 'boq_ut_items' : 'boq_aanwijzing_items';
    const row = db.prepare(
      `SELECT 1 FROM ${table} WHERE id_ihld = ? AND is_section = 0 AND TRIM(designator) != '' LIMIT 1`
    ).get(idIhld) as { '1': number } | undefined;
    return row !== undefined;
  }

  /**
   * Get aggregated designator-level BOQ data for a project from
   * either boq_ut_items or boq_aanwijzing_items.
   * Returns volume and cost summed per designator.
   */
  static getItemsByProject(idIhld: string, source: 'ut' | 'aanwijzing'): CheckBoqDbRow[] {
    const table = source === 'ut' ? 'boq_ut_items' : 'boq_aanwijzing_items';
    return db.prepare(`
      SELECT designator,
             SUM(volume) AS volume,
             SUM(total)  AS total
      FROM ${table}
      WHERE id_ihld = ? AND is_section = 0 AND TRIM(designator) != ''
      GROUP BY designator
      ORDER BY MIN(no) ASC, designator ASC
    `).all(idIhld) as CheckBoqDbRow[];
  }
}
