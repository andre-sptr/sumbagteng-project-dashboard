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
