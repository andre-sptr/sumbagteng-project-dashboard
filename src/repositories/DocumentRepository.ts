import { db } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';
import type { Document } from '@/types/database';

export class DocumentRepository {
  static create(data: Omit<Document, 'id' | 'upload_date' | 'version'>): Document {
    const id = uuidv4();
    const upload_date = new Date().toISOString();
    const version = 1;

    db.prepare(`
      INSERT INTO documents (
        id, project_uid, category, name, file_path, 
        file_size, mime_type, version, parent_document_id, 
        uploaded_by, upload_date, tags, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.project_uid, data.category, data.name, data.file_path,
      data.file_size, data.mime_type, version, data.parent_document_id || null,
      data.uploaded_by, upload_date, data.tags || '[]', data.notes || ''
    );

    return { ...data, id, upload_date, version };
  }

  static getByProjectId(projectUid: string): Document[] {
    return db.prepare(`
      SELECT * FROM documents 
      WHERE project_uid = ? 
      ORDER BY upload_date DESC
    `).all(projectUid) as Document[];
  }

  static findById(id: string): Document | undefined {
    return db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as Document | undefined;
  }

  static delete(id: string) {
    db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  }

  static update(id: string, data: Partial<Omit<Document, 'id' | 'project_uid'>>) {
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
    const stmt = db.prepare(`UPDATE documents SET ${sets.join(', ')} WHERE id = ?`);
    return stmt.run(...values);
  }

  static getCategories(): string[] {
    const results = db.prepare('SELECT DISTINCT category FROM documents ORDER BY category').all() as { category: string }[];
    return results.map(r => r.category);
  }
}
