import { db, Project } from '../lib/db';

// Repository for Project entities
export class ProjectRepository {
  // Find project by UID (id_ihld::batch_program)
  static findByUid(uid: string): Project | undefined {
    return db.prepare('SELECT * FROM projects WHERE uid = ?').get(uid) as Project | undefined;
  }

  // Get all projects for region
  static findAllByRegion(region: string = 'SUMBAGTENG'): Project[] {
    return db.prepare('SELECT * FROM projects WHERE region = ? ORDER BY last_changed_at DESC').all(region) as Project[];
  }

  // Get project names and IDs for select inputs
  static getForSelect(): { nama_lop: string; id_ihld: string }[] {
    return db.prepare(`
      SELECT DISTINCT nama_lop, id_ihld 
      FROM projects 
      WHERE nama_lop IS NOT NULL AND nama_lop != '' 
      ORDER BY nama_lop ASC
    `).all() as { nama_lop: string; id_ihld: string }[];
  }

  // Insert or update project with history tracking
  static upsert(data: {
    uid: string;
    id_ihld: string;
    batch_program: string;
    nama_lop: string;
    region: string;
    status: string;
    sub_status: string;
    full_data: string;
    history: string;
    area: string;
    branch: string;
    mitra: string;
    sto: string;
    odp_planned: number;
    port_planned: number;
    port_realized: number;
    golive_target: string;
    golive_actual: string;
  }) {
    const stmt = db.prepare(`
      INSERT INTO projects (
        uid, id_ihld, batch_program, nama_lop, region, status, sub_status,
        full_data, last_changed_at, history,
        area, branch, mitra, sto, odp_planned, port_planned, port_realized,
        golive_target, golive_actual
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uid) DO UPDATE SET
        id_ihld = excluded.id_ihld,
        batch_program = excluded.batch_program,
        nama_lop = excluded.nama_lop,
        region = excluded.region,
        status = excluded.status,
        sub_status = excluded.sub_status,
        full_data = excluded.full_data,
        last_changed_at = CASE
          WHEN projects.sub_status != excluded.sub_status OR projects.status != excluded.status
          THEN CURRENT_TIMESTAMP
          ELSE projects.last_changed_at
        END,
        history = excluded.history,
        area = excluded.area,
        branch = excluded.branch,
        mitra = excluded.mitra,
        sto = excluded.sto,
        odp_planned = excluded.odp_planned,
        port_planned = excluded.port_planned,
        port_realized = excluded.port_realized,
        golive_target = excluded.golive_target,
        golive_actual = excluded.golive_actual
    `);

    return stmt.run(
      data.uid,
      data.id_ihld,
      data.batch_program,
      data.nama_lop,
      data.region,
      data.status,
      data.sub_status,
      data.full_data,
      data.history,
      data.area,
      data.branch,
      data.mitra,
      data.sto,
      data.odp_planned,
      data.port_planned,
      data.port_realized,
      data.golive_target,
      data.golive_actual
    );
  }
}
