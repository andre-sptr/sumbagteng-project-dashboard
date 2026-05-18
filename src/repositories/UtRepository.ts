import { db } from '../lib/db';
import type { BoqItem } from '../lib/excel';

export interface UT {
  id: string;
  nama_lop: string;
  id_ihld: string;
  witel: string;
  tematik: string;
  sto: string;
  tim_ut: string;
  commtest_ut: string;
  jumlah_odp: number;
  jumlah_port: number;
  tanggal_ct_ut: string;
  temuan: string;
  follow_up_mitra: number;
  mitra: string;
  jumlah_temuan: number;
  wa_spang: string;
  komitmen_penyelesaian: string;
  created_at: string;
  updated_at: string;
}

export interface BoqUt {
  id: string;
  ut_id: string;
  nama_lop: string;
  id_ihld: string;
  full_data: string;
  created_at: string;
  updated_at: string;
}

export class UtRepository {
  static findAll(): UT[] {
    return db.prepare('SELECT * FROM ut ORDER BY created_at DESC').all() as UT[];
  }

  static findAllWithBoq(): Array<UT & { boq_data: BoqUt | null }> {
    const list = db.prepare('SELECT * FROM ut ORDER BY created_at DESC').all() as UT[];
    if (list.length === 0) return [];

    const ids = list.map(u => u.id);
    const placeholders = ids.map(() => '?').join(',');
    const boqs = db.prepare(
      `SELECT * FROM boq_ut WHERE ut_id IN (${placeholders})`
    ).all(...ids) as BoqUt[];

    const boqMap = new Map(boqs.map(b => [b.ut_id, b]));
    return list.map(u => ({ ...u, boq_data: boqMap.get(u.id) ?? null }));
  }

  static findById(id: string): UT | undefined {
    return db.prepare('SELECT * FROM ut WHERE id = ?').get(id) as UT | undefined;
  }

  static delete(id: string) {
    return db.prepare('DELETE FROM ut WHERE id = ?').run(id);
  }

  static upsert(data: Omit<UT, 'created_at' | 'updated_at'>) {
    return db.prepare(`
      INSERT INTO ut (
        id, nama_lop, id_ihld, witel, tematik, sto, tim_ut, commtest_ut,
        jumlah_odp, jumlah_port, tanggal_ct_ut, temuan, follow_up_mitra,
        mitra, jumlah_temuan, wa_spang, komitmen_penyelesaian, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        nama_lop = excluded.nama_lop,
        id_ihld = excluded.id_ihld,
        witel = excluded.witel,
        tematik = excluded.tematik,
        sto = excluded.sto,
        tim_ut = excluded.tim_ut,
        commtest_ut = excluded.commtest_ut,
        jumlah_odp = excluded.jumlah_odp,
        jumlah_port = excluded.jumlah_port,
        tanggal_ct_ut = excluded.tanggal_ct_ut,
        temuan = excluded.temuan,
        follow_up_mitra = excluded.follow_up_mitra,
        mitra = excluded.mitra,
        jumlah_temuan = excluded.jumlah_temuan,
        wa_spang = excluded.wa_spang,
        komitmen_penyelesaian = excluded.komitmen_penyelesaian,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      data.id, data.nama_lop, data.id_ihld, data.witel, data.tematik,
      data.sto, data.tim_ut, data.commtest_ut, data.jumlah_odp, data.jumlah_port,
      data.tanggal_ct_ut, data.temuan, data.follow_up_mitra, data.mitra,
      data.jumlah_temuan, data.wa_spang, data.komitmen_penyelesaian
    );
  }

  static getBoq(utId: string): BoqUt | undefined {
    return db.prepare('SELECT * FROM boq_ut WHERE ut_id = ?').get(utId) as BoqUt | undefined;
  }

  static upsertBoq(data: {
    id: string;
    ut_id: string;
    nama_lop: string;
    id_ihld: string;
    full_data: string;
  }) {
    return db.prepare(`
      INSERT INTO boq_ut (
        id, ut_id, nama_lop, id_ihld, full_data, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        ut_id = excluded.ut_id,
        nama_lop = excluded.nama_lop,
        id_ihld = excluded.id_ihld,
        full_data = excluded.full_data,
        updated_at = CURRENT_TIMESTAMP
    `).run(data.id, data.ut_id, data.nama_lop, data.id_ihld, data.full_data);
  }

  static upsertBoqWithItems(
    data: { ut_id: string; nama_lop: string; id_ihld: string },
    items: BoqItem[]
  ): string {
    const txn = db.transaction((): string => {
      const fullData = JSON.stringify(items);
      const existing = db.prepare('SELECT id FROM boq_ut WHERE ut_id = ?')
        .get(data.ut_id) as { id: string } | undefined;

      let boqId: string;
      if (existing) {
        boqId = existing.id;
        db.prepare(
          'UPDATE boq_ut SET nama_lop = ?, id_ihld = ?, full_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(data.nama_lop, data.id_ihld, fullData, boqId);
      } else {
        boqId = `boqut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        db.prepare(`
          INSERT INTO boq_ut (id, ut_id, nama_lop, id_ihld, full_data, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(boqId, data.ut_id, data.nama_lop, data.id_ihld, fullData);
      }

      db.prepare('DELETE FROM boq_ut_items WHERE boq_ut_id = ?').run(boqId);

      const insertItem = db.prepare(`
        INSERT INTO boq_ut_items (
          id, boq_ut_id, nama_lop, id_ihld,
          no, is_section, designator, uraian_pekerjaan, satuan,
          harga_satuan_material, harga_satuan_jasa, volume,
          total_material, total_jasa, total, keterangan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const ts = Date.now();
      items.forEach((item, i) => {
        insertItem.run(
          `bui_${ts}_${i.toString(36).padStart(4, '0')}`,
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

  static deleteBoqByUtId(utId: string) {
    return db.prepare('DELETE FROM boq_ut WHERE ut_id = ?').run(utId);
  }
}
