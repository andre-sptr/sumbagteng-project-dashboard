// ============================================================================
// Database Record Types
// ============================================================================
//
// Single source of truth for all SQLite table row interfaces.
// Each interface maps 1:1 to a database table.
// ============================================================================

// ---------------------------------------------------------------------------
// Core Tables
// ---------------------------------------------------------------------------

/** Row from the `projects` table. */
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
  golive_target_violated?: number;
}

/** Row from the `aanwijzing` table. */
export interface Aanwijzing {
  id: string;
  nama_lop: string;
  id_ihld: string;
  tematik: string;
  area: string;
  sto: string;
  tanggal_aanwijzing: string;
  catatan: string;
  status_after_aanwijzing: string;
  gpon: string;
  odc_name: string;
  frame: number;
  slot_awal: number;
  slot_akhir: number;
  port_awal: number;
  port_akhir: number;
  wa_spang: string;
  ut: string;
  created_at: string;
  updated_at: string;
}

/** Row from the `ut` table. */
export interface UtRecord {
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
  mitra: string;
  jumlah_temuan: number;
  wa_spang: string;
  komitmen_penyelesaian: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// BoQ Tables
// ---------------------------------------------------------------------------

/** Row from the `boq` table. */
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

/** Row from the `boq_aanwijzing` table. */
export interface BoqAanwijzing {
  id: string;
  aanwijzing_id: string;
  nama_lop: string;
  id_ihld: string;
  full_data: string;
  created_at: string;
  updated_at: string;
}

/** Row from the `boq_ut` table. */
export interface BoqUt {
  id: string;
  ut_id: string;
  nama_lop: string;
  id_ihld: string;
  full_data: string;
  created_at: string;
  updated_at: string;
}

/** Shared shape for normalized BoQ item rows (boq_plan_items, boq_aanwijzing_items, boq_ut_items). */
export interface BoqItem {
  id: string;
  /** Parent FK — column name varies per table (boq_plan_id / boq_aanwijzing_id / boq_ut_id). */
  parent_id: string;
  project_uid: string;
  nama_lop: string;
  id_ihld: string;
  no: number;
  is_section: number;
  designator: string;
  uraian_pekerjaan: string;
  satuan: string;
  harga_satuan_material: number;
  harga_satuan_jasa: number;
  volume: number;
  total_material: number;
  total_jasa: number;
  total: number;
  keterangan: string;
}

// ---------------------------------------------------------------------------
// Topology Tables
// ---------------------------------------------------------------------------

/** Row from the `olt_odc_map` table. */
export interface OltOdcMap {
  id: number;
  area: string;
  sto: string;
  olt_name: string;
  odc_name: string;
  port_str: string;
  frame: string;
  slot: number;
  port: number;
}

/** Row from the `topology_allocations` table. */
export interface TopologyAllocation {
  id: number;
  aanwijzing_id: string;
  nama_lop: string;
  id_ihld: string;
  area: string;
  sto: string;
  olt_name: string;
  odc_name: string;
  frame: number;
  slot: number;
  port: number;
  port_str: string;
  created_at: string;
  updated_at: string;
}

export type TopologyLocationEntityType = 'core' | 'area' | 'sto' | 'olt' | 'odc';
export type TopologyLocationConfidence = 'verified' | 'estimated';

/** Row from the `topology_locations` table. */
export interface TopologyLocation {
  id: number;
  entity_type: TopologyLocationEntityType;
  entity_name: string;
  area: string;
  sto: string;
  latitude: number;
  longitude: number;
  source: string;
  confidence: TopologyLocationConfidence;
  notes: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Supporting Tables
// ---------------------------------------------------------------------------

/** Row from the `sync_logs` table. */
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

/** Row from the `documents` table. */
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

/** Row from the `audit_logs` table. */
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

/** Row from the `column_config` table. */
export interface ColumnConfig {
  field_key: string;
  label: string;
  header_text: string;
  col_index: number;
  sort_order: number;
}
