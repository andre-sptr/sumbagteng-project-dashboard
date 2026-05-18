import { db } from '../lib/db';
import type { BoqItem } from '../lib/excel';

export interface Aanwijzing {
  id: string;
  nama_lop: string;
  id_ihld: string;
  tematik: string;
  tanggal_aanwijzing: string;
  catatan: string;
  status_after_aanwijzing: string;
  gpon: string;
  frame: number;
  slot_awal: number;
  slot_akhir: number;
  port_awal: number;
  port_akhir: number;
  wa_spang: string;
  ut: string;
  updated_at: string;
}

export interface BoqAanwijzing {
  id: string;
  aanwijzing_id: string;
  nama_lop: string;
  id_ihld: string;
  full_data: string;
  created_at: string;
  updated_at: string;
}

export class AanwijzingRepository {
  static findAll(): Aanwijzing[] {
    return db.prepare('SELECT * FROM aanwijzing ORDER BY created_at DESC').all() as Aanwijzing[];
  }

  static findAllWithBoq(): Array<Aanwijzing & { boq_data: BoqAanwijzing | null }> {
    const list = db.prepare('SELECT * FROM aanwijzing ORDER BY created_at DESC').all() as Aanwijzing[];
    if (list.length === 0) return [];

    const ids = list.map(a => a.id);
    const placeholders = ids.map(() => '?').join(',');
    const boqs = db.prepare(
      `SELECT * FROM boq_aanwijzing WHERE aanwijzing_id IN (${placeholders})`
    ).all(...ids) as BoqAanwijzing[];

    const boqMap = new Map(boqs.map(b => [b.aanwijzing_id, b]));
    return list.map(a => ({ ...a, boq_data: boqMap.get(a.id) ?? null }));
  }

  static findById(id: string): Aanwijzing | undefined {
    return db.prepare('SELECT * FROM aanwijzing WHERE id = ?').get(id) as Aanwijzing | undefined;
  }

  static delete(id: string) {
    return db.prepare('DELETE FROM aanwijzing WHERE id = ?').run(id);
  }

  static upsert(data: Omit<Aanwijzing, 'created_at' | 'updated_at'>) {
    return db.prepare(`
      INSERT INTO aanwijzing (
        id, nama_lop, id_ihld, tematik, tanggal_aanwijzing, catatan,
        status_after_aanwijzing, gpon, frame, slot_awal, slot_akhir,
        port_awal, port_akhir, wa_spang, ut, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        nama_lop = excluded.nama_lop,
        id_ihld = excluded.id_ihld,
        tematik = excluded.tematik,
        tanggal_aanwijzing = excluded.tanggal_aanwijzing,
        catatan = excluded.catatan,
        status_after_aanwijzing = excluded.status_after_aanwijzing,
        gpon = excluded.gpon,
        frame = excluded.frame,
        slot_awal = excluded.slot_awal,
        slot_akhir = excluded.slot_akhir,
        port_awal = excluded.port_awal,
        port_akhir = excluded.port_akhir,
        wa_spang = excluded.wa_spang,
        ut = excluded.ut,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      data.id, data.nama_lop, data.id_ihld, data.tematik,
      data.tanggal_aanwijzing, data.catatan, data.status_after_aanwijzing,
      data.gpon, data.frame, data.slot_awal, data.slot_akhir,
      data.port_awal, data.port_akhir, data.wa_spang, data.ut
    );
  }

  static getBoq(aanwijzingId: string): BoqAanwijzing | undefined {
    return db.prepare('SELECT * FROM boq_aanwijzing WHERE aanwijzing_id = ?')
      .get(aanwijzingId) as BoqAanwijzing | undefined;
  }

  static upsertBoq(data: {
    id: string;
    aanwijzing_id: string;
    nama_lop: string;
    id_ihld: string;
    full_data: string;
  }) {
    return db.prepare(`
      INSERT INTO boq_aanwijzing (
        id, aanwijzing_id, nama_lop, id_ihld, full_data, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        aanwijzing_id = excluded.aanwijzing_id,
        nama_lop = excluded.nama_lop,
        id_ihld = excluded.id_ihld,
        full_data = excluded.full_data,
        updated_at = CURRENT_TIMESTAMP
    `).run(data.id, data.aanwijzing_id, data.nama_lop, data.id_ihld, data.full_data);
  }

  static upsertBoqWithItems(
    data: { aanwijzing_id: string; nama_lop: string; id_ihld: string },
    items: BoqItem[]
  ): string {
    const txn = db.transaction((): string => {
      const fullData = JSON.stringify(items);
      const existing = db.prepare('SELECT id FROM boq_aanwijzing WHERE aanwijzing_id = ?')
        .get(data.aanwijzing_id) as { id: string } | undefined;

      let boqId: string;
      if (existing) {
        boqId = existing.id;
        db.prepare(
          'UPDATE boq_aanwijzing SET nama_lop = ?, id_ihld = ?, full_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(data.nama_lop, data.id_ihld, fullData, boqId);
      } else {
        boqId = `boqa_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        db.prepare(`
          INSERT INTO boq_aanwijzing (id, aanwijzing_id, nama_lop, id_ihld, full_data, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(boqId, data.aanwijzing_id, data.nama_lop, data.id_ihld, fullData);
      }

      db.prepare('DELETE FROM boq_aanwijzing_items WHERE boq_aanwijzing_id = ?').run(boqId);

      const insertItem = db.prepare(`
        INSERT INTO boq_aanwijzing_items (
          id, boq_aanwijzing_id, nama_lop, id_ihld,
          no, is_section, designator, uraian_pekerjaan, satuan,
          harga_satuan_material, harga_satuan_jasa, volume,
          total_material, total_jasa, total, keterangan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const ts = Date.now();
      items.forEach((item, i) => {
        insertItem.run(
          `bai_${ts}_${i.toString(36).padStart(4, '0')}`,
          boqId, data.nama_lop, data.id_ihld,
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

  static deleteBoqByAanwijzingId(aanwijzingId: string) {
    return db.prepare('DELETE FROM boq_aanwijzing WHERE aanwijzing_id = ?').run(aanwijzingId);
  }
}
