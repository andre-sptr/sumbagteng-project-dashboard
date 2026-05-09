import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { initializeSchema } from './schema';
import { getDatabasePath } from './env';

function resolveDatabasePath(configuredPath: string): string {
  if (path.isAbsolute(configuredPath)) {
    return configuredPath;
  }

  const normalizedPath = configuredPath.replace(/^[./\\]+/, '').replace(/\\/g, '/');
  if (normalizedPath === 'data/projects.db') {
    return path.join(process.cwd(), 'data', 'projects.db');
  }

  return path.join(/* turbopackIgnore: true */ process.cwd(), configuredPath);
}

const dbPath = resolveDatabasePath(getDatabasePath());
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

initializeSchema(db);

export interface Project {
  uid: string;
  id_ihld: string;
  batch_program: string;
  nama_lop: string;
  region: string;
  status: string;
  sub_status: string;
  full_data: string;
  last_changed_at: string;
  history: string;
  // Normalized columns populated by sync-service (migration 7)
  area: string;
  branch: string;
  mitra: string;
  sto: string;
  odp_planned: number;
  port_planned: number;
  port_realized: number;
  golive_target: string | null;
  golive_actual: string | null;
}

export interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  started_at: string;
  completed_at?: string;
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_failed: number;
  error_message?: string;
  details: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  related_entity_type?: string;
  related_entity_id?: string;
  is_read: number;
  created_at: string;
  read_at?: string;
}

export interface Document {
  id: string;
  project_uid: string;
  category: string;
  name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  version: number;
  parent_document_id?: string;
  uploaded_by: string;
  upload_date: string;
  tags: string;
  notes: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value: string;
  new_value: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

