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
  total_vol: number;
  total_cost: number;
}

export interface TrackingProjectRow {
  designator: string;
  plan_vol: number | null;
  plan_cost: number | null;
  ut_vol: number | null;
  ut_cost: number | null;
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
      const existing = db.prepare('SELECT id FROM boq WHERE project_uid = ?')
        .get(data.project_uid) as { id: string } | undefined;

      let boqId: string;
      if (existing) {
        boqId = existing.id;
        db.prepare(
          'UPDATE boq SET nama_lop = ?, id_ihld = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(data.nama_lop, data.id_ihld, boqId);
      } else {
        boqId = `boq_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        db.prepare(`
          INSERT INTO boq (id, nama_lop, id_ihld, sto, project_name, full_data, project_uid, created_at, updated_at)
          VALUES (?, ?, ?, '', ?, '', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(boqId, data.nama_lop, data.id_ihld, data.nama_lop, data.project_uid);
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
      SELECT designator,
             COUNT(DISTINCT id_ihld) AS jumlah_project,
             SUM(volume)             AS total_vol,
             SUM(total)              AS total_cost
      FROM boq_ut_items
      GROUP BY designator
      ORDER BY total_cost DESC
    `).all() as TrackingGlobalRow[];
  }

  static getTrackingByProject(idIhld: string): TrackingProjectRow[] {
    return db.prepare(`
      SELECT bp.designator,
             bp.volume AS plan_vol,
             bp.total  AS plan_cost,
             bu.volume AS ut_vol,
             bu.total  AS ut_cost
      FROM boq_plan_items bp
      LEFT JOIN boq_ut_items bu
        ON bu.id_ihld = bp.id_ihld AND bu.designator = bp.designator
      WHERE bp.id_ihld = ?
      ORDER BY bp.no ASC
    `).all(idIhld) as TrackingProjectRow[];
  }
}
