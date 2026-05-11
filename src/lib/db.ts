import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { initializeSchema } from './schema';
import { getDatabasePath } from './env';

export type { Document, Project, SyncLog } from '@/types/database';

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

