import { Database } from 'better-sqlite3';
import { COLUMN_FIELDS } from './sheet-columns';

interface Migration {
  id: number;
  name: string;
  run: (db: Database) => void;
}

// ============================================================================
// Database Migrations
// ============================================================================
//
// Migration phases:
//   1-3   : Phase 1 — Core tables (projects, aanwijzing, ut, boq) + indexes
//   4-7   : Phase 2 — Extended tables (olt/odc inventory, vendors, project cols)
//   8-9   : Phase 3 — Supporting tables (sync_logs, notifications, documents,
//                      audit_logs) + performance indexes
//   10-12 : Phase 4 — Topology & BoQ normalization (olt_odc_map, boq items)
//   13-15 : Phase 5 — Column cleanup (drop unused projects/boq/ut columns)
//   16-18 : Phase 6 — Topology allocations & column config
//   20    : Phase 7 — Drop unused tables (olt_inventory, odc_inventory,
//                      vendors, notifications)
//   23    : Phase 8 - Topology map location metadata
// ============================================================================

const migrations: Migration[] = [
  // ---------------------------------------------------------------------------
  // Phase 1: Core tables
  // ---------------------------------------------------------------------------
  {
    id: 1,
    name: 'initial_schema',
    run: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
          uid TEXT PRIMARY KEY,
          id_ihld TEXT NOT NULL,
          batch_program TEXT NOT NULL DEFAULT '',
          nama_lop TEXT DEFAULT '',
          region TEXT NOT NULL,
          status TEXT NOT NULL,
          sub_status TEXT NOT NULL,
          full_data TEXT DEFAULT '[]',
          last_changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          history TEXT DEFAULT '[]'
        );
        CREATE TABLE IF NOT EXISTS aanwijzing (
          id TEXT PRIMARY KEY,
          nama_lop TEXT NOT NULL,
          id_ihld TEXT NOT NULL,
          tematik TEXT DEFAULT '',
          tanggal_aanwijzing TEXT NOT NULL,
          catatan TEXT DEFAULT '',
          status_after_aanwijzing TEXT DEFAULT '',
          gpon TEXT DEFAULT '',
          frame INTEGER DEFAULT 0,
          slot_awal INTEGER DEFAULT 0,
          slot_akhir INTEGER DEFAULT 0,
          port_awal INTEGER DEFAULT 0,
          port_akhir INTEGER DEFAULT 0,
          wa_spang TEXT DEFAULT '',
          ut TEXT DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS ut (
          id TEXT PRIMARY KEY,
          nama_lop TEXT NOT NULL,
          id_ihld TEXT NOT NULL,
          witel TEXT DEFAULT '',
          tematik TEXT DEFAULT '',
          sto TEXT DEFAULT '',
          tim_ut TEXT DEFAULT '',
          commtest_ut TEXT DEFAULT '',
          jumlah_odp INTEGER DEFAULT 0,
          jumlah_port INTEGER DEFAULT 0,
          tanggal_ct_ut TEXT DEFAULT '',
          temuan TEXT DEFAULT '',
          mitra TEXT DEFAULT '',
          jumlah_temuan INTEGER DEFAULT 0,
          wa_spang TEXT DEFAULT '',
          komitmen_penyelesaian TEXT DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS boq (
          id TEXT PRIMARY KEY,
          nama_lop TEXT NOT NULL,
          id_ihld TEXT NOT NULL DEFAULT '',
          sto TEXT NOT NULL DEFAULT '',
          batch_program TEXT NOT NULL DEFAULT '',
          project_name TEXT NOT NULL DEFAULT '',
          region TEXT NOT NULL DEFAULT 'SUMBAGTENG',
          full_data TEXT DEFAULT '[]',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS boq_aanwijzing (
          id TEXT PRIMARY KEY,
          aanwijzing_id TEXT NOT NULL,
          nama_lop TEXT NOT NULL,
          id_ihld TEXT NOT NULL DEFAULT '',
          full_data TEXT DEFAULT '[]',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS boq_ut (
          id TEXT PRIMARY KEY,
          ut_id TEXT NOT NULL,
          nama_lop TEXT NOT NULL,
          id_ihld TEXT NOT NULL DEFAULT '',
          full_data TEXT DEFAULT '[]',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }
  },
  {
    id: 2,
    name: 'fix_boq_aanwijzing_full_data_column',
    run: (db) => {
      const tableInfo = db.pragma('table_info(boq_aanwijzing)') as { name: string }[];
      const columns = tableInfo.map((c) => c.name);

      if (columns.includes('boq_items') && !columns.includes('full_data')) {
        db.exec(`ALTER TABLE boq_aanwijzing RENAME COLUMN boq_items TO full_data`);
      } else if (!columns.includes('full_data')) {
        db.exec(`ALTER TABLE boq_aanwijzing ADD COLUMN full_data TEXT DEFAULT '[]'`);
      }
    }
  },
  {
    id: 3,
    name: 'add_indexes_for_performance',
    run: (db) => {
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_projects_region ON projects(region);
        CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
        CREATE INDEX IF NOT EXISTS idx_projects_last_changed ON projects(last_changed_at);
        CREATE INDEX IF NOT EXISTS idx_aanwijzing_id_ihld ON aanwijzing(id_ihld);
        CREATE INDEX IF NOT EXISTS idx_ut_id_ihld ON ut(id_ihld);
        CREATE INDEX IF NOT EXISTS idx_boq_aanwijzing_aid ON boq_aanwijzing(aanwijzing_id);
        CREATE INDEX IF NOT EXISTS idx_boq_ut_uid ON boq_ut(ut_id);
      `);
    }
  },
  // ---------------------------------------------------------------------------
  // Phase 2: Extended tables (most later dropped in migration 20)
  // ---------------------------------------------------------------------------
  {
    id: 4,
    name: 'create_olt_inventory_table',
    run: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS olt_inventory (
          id TEXT PRIMARY KEY,
          ip_address TEXT UNIQUE NOT NULL,
          hostname TEXT NOT NULL,
          brand TEXT DEFAULT '',
          model TEXT DEFAULT '',
          software_version TEXT DEFAULT '',
          serial_number TEXT UNIQUE,
          location_name TEXT DEFAULT '',
          latitude REAL,
          longitude REAL,
          area TEXT DEFAULT '',
          branch TEXT DEFAULT '',
          sto TEXT DEFAULT '',
          uplink_config TEXT DEFAULT '{}',
          dualhoming_enabled INTEGER DEFAULT 0,
          dualhoming_pair TEXT,
          total_ports INTEGER DEFAULT 0,
          used_ports INTEGER DEFAULT 0,
          available_ports INTEGER DEFAULT 0,
          cacti_integrated INTEGER DEFAULT 0,
          cacti_device_id TEXT,
          nms_integrated INTEGER DEFAULT 0,
          nms_device_id TEXT,
          status TEXT DEFAULT 'active',
          installation_date TEXT,
          last_maintenance_date TEXT,
          next_maintenance_date TEXT,
          notes TEXT DEFAULT '',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_olt_ip ON olt_inventory(ip_address);
        CREATE INDEX IF NOT EXISTS idx_olt_hostname ON olt_inventory(hostname);
        CREATE INDEX IF NOT EXISTS idx_olt_area ON olt_inventory(area);
        CREATE INDEX IF NOT EXISTS idx_olt_status ON olt_inventory(status);
      `);
    }
  },
  {
    id: 5,
    name: 'create_odc_inventory_table',
    run: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS odc_inventory (
          id TEXT PRIMARY KEY,
          odc_name TEXT UNIQUE NOT NULL,
          regional TEXT DEFAULT '',
          witel TEXT DEFAULT '',
          datel TEXT DEFAULT '',
          sto TEXT NOT NULL,
          olt_id TEXT,
          splitter_type TEXT DEFAULT '',
          max_capacity INTEGER DEFAULT 0,
          used_capacity INTEGER DEFAULT 0,
          available_capacity INTEGER DEFAULT 0,
          latitude REAL,
          longitude REAL,
          polygon_coordinates TEXT DEFAULT '[]',
          polygon_status TEXT DEFAULT 'planned',
          installation_date TEXT,
          status TEXT DEFAULT 'active',
          notes TEXT DEFAULT '',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (olt_id) REFERENCES olt_inventory(id)
        );

        CREATE INDEX IF NOT EXISTS idx_odc_name ON odc_inventory(odc_name);
        CREATE INDEX IF NOT EXISTS idx_odc_sto ON odc_inventory(sto);
        CREATE INDEX IF NOT EXISTS idx_odc_olt ON odc_inventory(olt_id);
        CREATE INDEX IF NOT EXISTS idx_odc_status ON odc_inventory(status);
      `);
    }
  },
  {
    id: 6,
    name: 'create_vendors_table',
    run: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS vendors (
          id TEXT PRIMARY KEY,
          vendor_name TEXT UNIQUE NOT NULL,
          vendor_code TEXT UNIQUE,
          contact_person TEXT DEFAULT '',
          phone TEXT DEFAULT '',
          email TEXT DEFAULT '',
          address TEXT DEFAULT '',
          contract_start_date TEXT,
          contract_end_date TEXT,
          contract_value REAL DEFAULT 0,
          rating REAL DEFAULT 0,
          total_projects INTEGER DEFAULT 0,
          completed_projects INTEGER DEFAULT 0,
          on_time_delivery_rate REAL DEFAULT 0,
          quality_score REAL DEFAULT 0,
          status TEXT DEFAULT 'active',
          notes TEXT DEFAULT '',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_vendor_name ON vendors(vendor_name);
        CREATE INDEX IF NOT EXISTS idx_vendor_status ON vendors(status);
      `);
    }
  },
  {
    id: 7,
    name: 'enhance_projects_table',
    run: (db) => {
      // Check existing columns to avoid duplicate additions
      const tableInfo = db.pragma('table_info(projects)') as { name: string }[];
      const columns = tableInfo.map((c) => c.name);

      const columnsToAdd = [
        { name: 'area', type: 'TEXT DEFAULT ""' },
        { name: 'witel', type: 'TEXT DEFAULT ""' },
        { name: 'datel', type: 'TEXT DEFAULT ""' },
        { name: 'sto', type: 'TEXT DEFAULT ""' },
        { name: 'branch', type: 'TEXT DEFAULT ""' },
        { name: 'mitra', type: 'TEXT DEFAULT ""' },
        { name: 'vendor_id', type: 'TEXT' },
        { name: 'olt_id', type: 'TEXT' },
        { name: 'odc_id', type: 'TEXT' },
        { name: 'odp_planned', type: 'INTEGER DEFAULT 0' },
        { name: 'odp_realized', type: 'INTEGER DEFAULT 0' },
        { name: 'port_planned', type: 'INTEGER DEFAULT 0' },
        { name: 'port_realized', type: 'INTEGER DEFAULT 0' },
        { name: 'boq_value', type: 'REAL DEFAULT 0' },
        { name: 'boq_currency', type: 'TEXT DEFAULT "IDR"' },
        { name: 'golive_target', type: 'TEXT' },
        { name: 'golive_actual', type: 'TEXT' },
        { name: 'project_manager', type: 'TEXT DEFAULT ""' },
        { name: 'technical_lead', type: 'TEXT DEFAULT ""' },
        { name: 'priority', type: 'TEXT DEFAULT "medium"' },
        { name: 'risk_level', type: 'TEXT DEFAULT "low"' },
        { name: 'completion_percentage', type: 'REAL DEFAULT 0' },
      ];

      for (const col of columnsToAdd) {
        if (!columns.includes(col.name)) {
          db.exec(`ALTER TABLE projects ADD COLUMN ${col.name} ${col.type}`);
        }
      }

      // Add indexes for new columns
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_projects_vendor ON projects(vendor_id);
        CREATE INDEX IF NOT EXISTS idx_projects_olt ON projects(olt_id);
        CREATE INDEX IF NOT EXISTS idx_projects_odc ON projects(odc_id);
        CREATE INDEX IF NOT EXISTS idx_projects_area ON projects(area);
        CREATE INDEX IF NOT EXISTS idx_projects_sto ON projects(sto);
        CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);
      `);
    }
  },
  // ---------------------------------------------------------------------------
  // Phase 3: Supporting tables (sync_logs, documents, audit_logs)
  // ---------------------------------------------------------------------------
  {
    id: 8,
    name: 'phase3_initial_tables',
    run: (db) => {
      db.exec(`
        -- Sync Logs
        CREATE TABLE IF NOT EXISTS sync_logs (
          id TEXT PRIMARY KEY,
          sync_type TEXT NOT NULL,
          status TEXT NOT NULL,
          started_at DATETIME NOT NULL,
          completed_at DATETIME,
          records_processed INTEGER DEFAULT 0,
          records_created INTEGER DEFAULT 0,
          records_updated INTEGER DEFAULT 0,
          records_failed INTEGER DEFAULT 0,
          error_message TEXT,
          details TEXT DEFAULT '{}'
        );

        -- Notifications
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          related_entity_type TEXT,
          related_entity_id TEXT,
          is_read INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          read_at DATETIME
        );

        CREATE TABLE IF NOT EXISTS notification_preferences (
          user_id TEXT PRIMARY KEY,
          email_enabled INTEGER DEFAULT 1,
          in_app_enabled INTEGER DEFAULT 1,
          notification_types TEXT DEFAULT '[]',
          digest_frequency TEXT DEFAULT 'daily'
        );

        -- Documents
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          project_uid TEXT NOT NULL,
          category TEXT NOT NULL,
          name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          mime_type TEXT NOT NULL,
          version INTEGER DEFAULT 1,
          parent_document_id TEXT,
          uploaded_by TEXT NOT NULL,
          upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          tags TEXT DEFAULT '[]',
          notes TEXT DEFAULT '',
          FOREIGN KEY (project_uid) REFERENCES projects(uid),
          FOREIGN KEY (parent_document_id) REFERENCES documents(id)
        );

        -- Audit Logs
        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          action TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          old_value TEXT DEFAULT '{}',
          new_value TEXT DEFAULT '{}',
          ip_address TEXT DEFAULT '',
          user_agent TEXT DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
        CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(created_at);
        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_uid);
      `);
    }
  },
  {
    id: 9,
    name: 'performance_indexing_v2',
    run: (db) => {
      db.exec(`
        -- Projects indexing
        CREATE INDEX IF NOT EXISTS idx_projects_id_ihld ON projects(id_ihld);
        CREATE INDEX IF NOT EXISTS idx_projects_batch ON projects(batch_program);
        CREATE INDEX IF NOT EXISTS idx_projects_sub_status ON projects(sub_status);
        
        -- Documents indexing
        CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
        
        -- Sync Logs indexing
        CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON sync_logs(sync_type);
        CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
        CREATE INDEX IF NOT EXISTS idx_sync_logs_date ON sync_logs(started_at);
      `);
    }
  },
  // ---------------------------------------------------------------------------
  // Phase 4: Topology & BoQ normalization
  // ---------------------------------------------------------------------------
  {
    id: 10,
    name: 'create_olt_odc_map_table',
    run: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS olt_odc_map (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          area TEXT NOT NULL,
          sto TEXT NOT NULL,
          olt_name TEXT NOT NULL,
          odc_name TEXT NOT NULL,
          UNIQUE(olt_name, odc_name)
        );
        CREATE INDEX IF NOT EXISTS idx_olt_odc_area ON olt_odc_map(area);
        CREATE INDEX IF NOT EXISTS idx_olt_odc_sto  ON olt_odc_map(sto);
        CREATE INDEX IF NOT EXISTS idx_olt_odc_olt  ON olt_odc_map(olt_name);
      `);
    }
  },
  {
    id: 11,
    name: 'recreate_olt_odc_map_with_ports',
    run: (db) => {
      db.exec(`
        DROP TABLE IF EXISTS olt_odc_map;
        CREATE TABLE IF NOT EXISTS olt_odc_map (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          area TEXT NOT NULL,
          sto TEXT NOT NULL,
          olt_name TEXT NOT NULL,
          odc_name TEXT NOT NULL,
          port_str TEXT NOT NULL,
          frame TEXT NOT NULL DEFAULT '',
          slot INTEGER NOT NULL,
          port INTEGER NOT NULL,
          UNIQUE(olt_name, port_str)
        );
        CREATE INDEX IF NOT EXISTS idx_olt_odc_area ON olt_odc_map(area);
        CREATE INDEX IF NOT EXISTS idx_olt_odc_sto  ON olt_odc_map(sto);
        CREATE INDEX IF NOT EXISTS idx_olt_odc_olt  ON olt_odc_map(olt_name);
        CREATE INDEX IF NOT EXISTS idx_olt_odc_slot ON olt_odc_map(olt_name, slot);
      `);
    }
  },
  {
    id: 12,
    name: 'boq_normalized_items',
    run: (db) => {
      // Add project_uid FK to boq table
      const boqCols = (db.pragma('table_info(boq)') as { name: string }[]).map(c => c.name);
      if (!boqCols.includes('project_uid')) {
        db.exec(`ALTER TABLE boq ADD COLUMN project_uid TEXT`);
      }

      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_boq_project_uid
          ON boq(project_uid) WHERE project_uid IS NOT NULL;

        CREATE TABLE IF NOT EXISTS boq_plan_items (
          id TEXT PRIMARY KEY,
          boq_plan_id TEXT NOT NULL REFERENCES boq(id) ON DELETE CASCADE,
          project_uid TEXT NOT NULL DEFAULT '',
          nama_lop TEXT NOT NULL DEFAULT '',
          id_ihld TEXT NOT NULL DEFAULT '',
          no INTEGER DEFAULT 0,
          is_section INTEGER DEFAULT 0,
          designator TEXT NOT NULL DEFAULT '',
          uraian_pekerjaan TEXT DEFAULT '',
          satuan TEXT DEFAULT '',
          harga_satuan_material REAL DEFAULT 0,
          harga_satuan_jasa REAL DEFAULT 0,
          volume REAL DEFAULT 0,
          total_material REAL DEFAULT 0,
          total_jasa REAL DEFAULT 0,
          total REAL DEFAULT 0,
          keterangan TEXT DEFAULT ''
        );
        CREATE INDEX IF NOT EXISTS idx_boq_plan_items_designator ON boq_plan_items(designator);
        CREATE INDEX IF NOT EXISTS idx_boq_plan_items_id_ihld ON boq_plan_items(id_ihld);
        CREATE INDEX IF NOT EXISTS idx_boq_plan_items_parent ON boq_plan_items(boq_plan_id);

        CREATE UNIQUE INDEX IF NOT EXISTS idx_boq_aanwijzing_one
          ON boq_aanwijzing(aanwijzing_id) WHERE aanwijzing_id IS NOT NULL;

        CREATE TABLE IF NOT EXISTS boq_aanwijzing_items (
          id TEXT PRIMARY KEY,
          boq_aanwijzing_id TEXT NOT NULL REFERENCES boq_aanwijzing(id) ON DELETE CASCADE,
          project_uid TEXT DEFAULT '',
          nama_lop TEXT NOT NULL DEFAULT '',
          id_ihld TEXT NOT NULL DEFAULT '',
          no INTEGER DEFAULT 0,
          is_section INTEGER DEFAULT 0,
          designator TEXT NOT NULL DEFAULT '',
          uraian_pekerjaan TEXT DEFAULT '',
          satuan TEXT DEFAULT '',
          harga_satuan_material REAL DEFAULT 0,
          harga_satuan_jasa REAL DEFAULT 0,
          volume REAL DEFAULT 0,
          total_material REAL DEFAULT 0,
          total_jasa REAL DEFAULT 0,
          total REAL DEFAULT 0,
          keterangan TEXT DEFAULT ''
        );
        CREATE INDEX IF NOT EXISTS idx_boq_aanwijzing_items_designator ON boq_aanwijzing_items(designator);
        CREATE INDEX IF NOT EXISTS idx_boq_aanwijzing_items_id_ihld ON boq_aanwijzing_items(id_ihld);
        CREATE INDEX IF NOT EXISTS idx_boq_aanwijzing_items_parent ON boq_aanwijzing_items(boq_aanwijzing_id);

        CREATE UNIQUE INDEX IF NOT EXISTS idx_boq_ut_one
          ON boq_ut(ut_id) WHERE ut_id IS NOT NULL;

        CREATE TABLE IF NOT EXISTS boq_ut_items (
          id TEXT PRIMARY KEY,
          boq_ut_id TEXT NOT NULL REFERENCES boq_ut(id) ON DELETE CASCADE,
          project_uid TEXT DEFAULT '',
          nama_lop TEXT NOT NULL DEFAULT '',
          id_ihld TEXT NOT NULL DEFAULT '',
          no INTEGER DEFAULT 0,
          is_section INTEGER DEFAULT 0,
          designator TEXT NOT NULL DEFAULT '',
          uraian_pekerjaan TEXT DEFAULT '',
          satuan TEXT DEFAULT '',
          harga_satuan_material REAL DEFAULT 0,
          harga_satuan_jasa REAL DEFAULT 0,
          volume REAL DEFAULT 0,
          total_material REAL DEFAULT 0,
          total_jasa REAL DEFAULT 0,
          total REAL DEFAULT 0,
          keterangan TEXT DEFAULT ''
        );
        CREATE INDEX IF NOT EXISTS idx_boq_ut_items_designator ON boq_ut_items(designator);
        CREATE INDEX IF NOT EXISTS idx_boq_ut_items_id_ihld ON boq_ut_items(id_ihld);
        CREATE INDEX IF NOT EXISTS idx_boq_ut_items_parent ON boq_ut_items(boq_ut_id);
      `);
    }
  },
  // ---------------------------------------------------------------------------
  // Phase 5: Column cleanup
  // ---------------------------------------------------------------------------
  {
    id: 13,
    name: 'drop_unused_projects_columns',
    run: (db) => {
      const projectCols = (db.pragma('table_info(projects)') as { name: string }[]).map(c => c.name);

      // Drop indexes before columns that have them
      const indexedCols: Record<string, string> = {
        vendor_id: 'idx_projects_vendor',
        olt_id: 'idx_projects_olt',
        odc_id: 'idx_projects_odc',
        priority: 'idx_projects_priority',
      };
      for (const [col, idx] of Object.entries(indexedCols)) {
        if (projectCols.includes(col)) {
          db.exec(`DROP INDEX IF EXISTS ${idx}`);
          db.exec(`ALTER TABLE projects DROP COLUMN ${col}`);
        }
      }

      // Drop columns with no index
      const simpleCols = [
        'witel', 'datel', 'boq_value', 'boq_currency',
        'project_manager', 'technical_lead', 'risk_level',
        'completion_percentage', 'odp_realized',
      ];
      for (const col of simpleCols) {
        if (projectCols.includes(col)) {
          db.exec(`ALTER TABLE projects DROP COLUMN ${col}`);
        }
      }

      // Drop notification_preferences — completely unused
      db.exec(`DROP TABLE IF EXISTS notification_preferences`);
    }
  },
  {
    id: 14,
    name: 'drop_unused_boq_columns',
    run: (db) => {
      const boqCols = (db.pragma('table_info(boq)') as { name: string }[]).map(c => c.name);
      for (const col of ['batch_program', 'region']) {
        if (boqCols.includes(col)) {
          db.exec(`ALTER TABLE boq DROP COLUMN ${col}`);
        }
      }
    }
  },
  {
    id: 15,
    name: 'drop_ut_follow_up_mitra',
    run: (db) => {
      const utCols = (db.pragma('table_info(ut)') as { name: string }[]).map(c => c.name);
      if (utCols.includes('follow_up_mitra')) {
        db.exec(`ALTER TABLE ut DROP COLUMN follow_up_mitra`);
      }
    }
  },
  // ---------------------------------------------------------------------------
  // Phase 6: Topology allocations & column config
  // ---------------------------------------------------------------------------
  {
    id: 16,
    name: 'aanwijzing_topology_allocations',
    run: (db) => {
      const aanwijzingCols = (db.pragma('table_info(aanwijzing)') as { name: string }[]).map(c => c.name);
      const columnsToAdd = [
        { name: 'area', type: 'TEXT DEFAULT ""' },
        { name: 'sto', type: 'TEXT DEFAULT ""' },
        { name: 'odc_name', type: 'TEXT DEFAULT ""' },
      ];

      for (const col of columnsToAdd) {
        if (!aanwijzingCols.includes(col.name)) {
          db.exec(`ALTER TABLE aanwijzing ADD COLUMN ${col.name} ${col.type}`);
        }
      }

      db.exec(`
        CREATE TABLE IF NOT EXISTS topology_allocations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          aanwijzing_id TEXT NOT NULL REFERENCES aanwijzing(id) ON DELETE CASCADE,
          nama_lop TEXT NOT NULL,
          id_ihld TEXT NOT NULL,
          area TEXT NOT NULL,
          sto TEXT NOT NULL,
          olt_name TEXT NOT NULL,
          odc_name TEXT NOT NULL,
          frame INTEGER NOT NULL,
          slot INTEGER NOT NULL,
          port INTEGER NOT NULL,
          port_str TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(olt_name, frame, slot, port)
        );
        CREATE INDEX IF NOT EXISTS idx_topology_allocations_aanwijzing ON topology_allocations(aanwijzing_id);
        CREATE INDEX IF NOT EXISTS idx_topology_allocations_location ON topology_allocations(area, sto, olt_name);
      `);
    }
  },
  {
    id: 17,
    name: 'create_column_config_table',
    run: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS column_config (
          field_key TEXT PRIMARY KEY,
          label TEXT NOT NULL,
          header_text TEXT NOT NULL DEFAULT '',
          col_index INTEGER NOT NULL,
          sort_order INTEGER NOT NULL
        );
      `);

      const insert = db.prepare(`
        INSERT OR IGNORE INTO column_config (field_key, label, header_text, col_index, sort_order)
        VALUES (?, ?, ?, ?, ?)
      `);
      COLUMN_FIELDS.forEach((field, order) => {
        insert.run(field.key, field.label, field.headerText, field.defaultIndex, order);
      });
    }
  },
  {
    id: 18,
    name: 'reseed_column_config_latest_layout',
    run: (db) => {
      // Re-apply the canonical column layout (KET moved to index 21, downstream
      // fields shifted +1, and four new AG–AJ fields added). Upsert so existing
      // installs adopt the new defaults and gain the new field rows.
      const upsert = db.prepare(`
        INSERT INTO column_config (field_key, label, header_text, col_index, sort_order)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(field_key) DO UPDATE SET
          label = excluded.label,
          header_text = excluded.header_text,
          col_index = excluded.col_index,
          sort_order = excluded.sort_order
      `);
      COLUMN_FIELDS.forEach((field, order) => {
        upsert.run(field.key, field.label, field.headerText, field.defaultIndex, order);
      });
    }
  },

  // ---------------------------------------------------------------------------
  // Phase 7: Drop unused tables
  // ---------------------------------------------------------------------------
  {
    id: 20,
    name: 'drop_unused_tables',
    run: (db) => {
      // Drop indexes first, then tables.
      // Tables dropped: olt_inventory, odc_inventory, vendors, notifications
      // Reason: No repository, no API route, no application code references.
      db.exec(`
        -- olt_inventory indexes
        DROP INDEX IF EXISTS idx_olt_ip;
        DROP INDEX IF EXISTS idx_olt_hostname;
        DROP INDEX IF EXISTS idx_olt_area;
        DROP INDEX IF EXISTS idx_olt_status;

        -- odc_inventory indexes
        DROP INDEX IF EXISTS idx_odc_name;
        DROP INDEX IF EXISTS idx_odc_sto;
        DROP INDEX IF EXISTS idx_odc_olt;
        DROP INDEX IF EXISTS idx_odc_status;

        -- vendors indexes
        DROP INDEX IF EXISTS idx_vendor_name;
        DROP INDEX IF EXISTS idx_vendor_status;

        -- notifications indexes
        DROP INDEX IF EXISTS idx_notifications_user;

        -- Drop tables
        DROP TABLE IF EXISTS olt_inventory;
        DROP TABLE IF EXISTS odc_inventory;
        DROP TABLE IF EXISTS vendors;
        DROP TABLE IF EXISTS notifications;
      `);
    }
  },
  {
    id: 21,
    name: 'add_golive_target_violated',
    run: (db) => {
      const projectCols = (db.pragma('table_info(projects)') as { name: string }[]).map(c => c.name);
      if (!projectCols.includes('golive_target_violated')) {
        db.exec(`ALTER TABLE projects ADD COLUMN golive_target_violated INTEGER DEFAULT 0`);
      }
    }
  },
  {
    id: 22,
    name: 'dedup_olt_odc_map_by_slot_port',
    run: (db) => {
      // The source OLT-ODC sheet records the same physical port with
      // inconsistent frame notation (e.g. "0/1/1" vs "0/0/1/1", "0/3/1" vs
      // "1/0/3/1"). These resolve to the same olt_name/slot/port but differ by
      // port_str, so the UNIQUE(olt_name, port_str) constraint let them through
      // and inflated port counts. Collapse to one row per physical port
      // (keeping the lowest id) and enforce uniqueness on (olt_name, slot, port)
      // going forward.
      db.exec(`
        DELETE FROM olt_odc_map
        WHERE id NOT IN (
          SELECT MIN(id) FROM olt_odc_map GROUP BY olt_name, slot, port
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_olt_odc_unique_port
          ON olt_odc_map(olt_name, slot, port);
      `);
    }
  },
  {
    id: 23,
    name: 'create_topology_locations',
    run: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS topology_locations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          entity_type TEXT NOT NULL CHECK (entity_type IN ('core', 'area', 'sto', 'olt', 'odc')),
          entity_name TEXT NOT NULL,
          area TEXT NOT NULL DEFAULT '',
          sto TEXT NOT NULL DEFAULT '',
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          source TEXT NOT NULL DEFAULT 'manual',
          confidence TEXT NOT NULL DEFAULT 'verified' CHECK (confidence IN ('verified', 'estimated')),
          notes TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(entity_type, entity_name, area, sto)
        );

        CREATE INDEX IF NOT EXISTS idx_topology_locations_entity
          ON topology_locations(entity_type, entity_name);
        CREATE INDEX IF NOT EXISTS idx_topology_locations_area_sto
          ON topology_locations(area, sto);
      `);
    }
  },
];

export function runMigrations(db: Database) {
  // Create migrations table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const appliedMigrations = db.prepare('SELECT id FROM _migrations').all() as { id: number }[];
  const appliedIds = new Set(appliedMigrations.map(m => m.id));

  for (const migration of migrations) {
    if (!appliedIds.has(migration.id)) {
      try {
        db.transaction(() => {
          migration.run(db);
          db.prepare('INSERT INTO _migrations (id, name) VALUES (?, ?)').run(migration.id, migration.name);
        })();
      } catch (error) {
        console.error(`[db] Failed to apply migration ${migration.id}:`, error);
        throw error;
      }
    }
  }
}
