import { db } from '../lib/db';
import { randomUUID } from 'crypto';
import type { SyncLog } from '@/types/database';

export class SyncLogRepository {
  static create(data: {
    sync_type: string;
    status: string;
    started_at: string;
    details?: string;
  }): string {
    const id = randomUUID();
    const stmt = db.prepare(`
      INSERT INTO sync_logs (id, sync_type, status, started_at, details)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, data.sync_type, data.status, data.started_at, data.details || '{}');
    return id;
  }

  static update(id: string, data: {
    status?: string;
    completed_at?: string;
    records_processed?: number;
    records_created?: number;
    records_updated?: number;
    records_failed?: number;
    error_message?: string;
    details?: string;
  }) {
    const sets: string[] = [];
    const values: unknown[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        sets.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (sets.length === 0) return;

    values.push(id);
    const stmt = db.prepare(`UPDATE sync_logs SET ${sets.join(', ')} WHERE id = ?`);
    return stmt.run(...values);
  }

  static findLatest(sync_type?: string): SyncLog | undefined {
    if (sync_type) {
      return db.prepare('SELECT * FROM sync_logs WHERE sync_type = ? ORDER BY started_at DESC LIMIT 1').get(sync_type) as SyncLog | undefined;
    }
    return db.prepare('SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT 1').get() as SyncLog | undefined;
  }

  static findAll(limit: number = 50): SyncLog[] {
    return db.prepare('SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT ?').all(limit) as SyncLog[];
  }
}
