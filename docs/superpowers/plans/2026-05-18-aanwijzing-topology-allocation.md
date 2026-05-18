# AANWIJZING Topology Allocation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect AANWIJZING GPON/frame/slot/port input to Network Topology by reserving empty topology ports for the submitted project.

**Architecture:** Keep imported topology master data in `olt_odc_map` unchanged and add a separate `topology_allocations` transaction table for AANWIJZING-created port reservations. The AANWIJZING API validates conflicts transactionally, replaces old allocations on edit, removes allocations on delete, and the topology view renders master and allocation ports together with different colors.

**Tech Stack:** Next.js App Router, React client components, TypeScript, better-sqlite3, Vitest, Tailwind CSS.

---

## File Structure

- Create `src/lib/topology-allocation.ts` for pure range generation, ODC detection, and conflict helpers.
- Create `src/repositories/TopologyAllocationRepository.ts` for persistence around `topology_allocations`.
- Modify `src/lib/migrations.ts` to create `topology_allocations` and add `area`, `sto`, `odc_name`, and `allow_overwrite` support fields to AANWIJZING.
- Modify `src/repositories/AanwijzingRepository.ts` to persist area/STO/ODC and manage allocations in transactions.
- Modify `src/repositories/OltOdcRepository.ts` and `src/lib/topology.ts` to merge imported master rows with allocation rows.
- Modify `src/repositories/ProjectRepository.ts` so AANWIJZING project select options include `area` and `sto`.
- Modify `src/app/api/aanwijzing/route.ts` to validate allocation conflicts and return overwrite warnings.
- Modify `src/app/(main)/aanwijzing/page.tsx` to add area/STO selects, GPON dropdown, ODC auto-detect/manual fallback, and overwrite retry.
- Modify `src/components/features/topology/NetworkTopology.tsx` to color allocation ports differently and show source metadata.
- Add `tests/topology-allocation.test.ts` and extend `tests/boq-json-submit.test.ts` for API allocation behavior.

## Task 1: Pure Allocation Logic

**Files:**
- Create: `src/lib/topology-allocation.ts`
- Test: `tests/topology-allocation.test.ts`

- [ ] **Step 1: Write tests for range generation and ODC detection**

Create `tests/topology-allocation.test.ts` with tests for:

```ts
import { describe, expect, it } from 'vitest';
import { buildPortAllocations, detectOdcName } from '../src/lib/topology-allocation';

describe('topology allocation helpers', () => {
  it('builds one allocation per slot and port using frame/slot/port string format', () => {
    const rows = buildPortAllocations({
      aanwijzing_id: 'AAN-1',
      nama_lop: 'RKP TSEL PT3 LBJ-FAN BUGIS JUNCTION',
      id_ihld: 'IHLD-1',
      area: 'RIKEP',
      sto: 'LBJ',
      olt_name: 'OLT-LBJ-1',
      odc_name: 'LBJ-FAN',
      frame: 1,
      slot_awal: 1,
      slot_akhir: 2,
      port_awal: 0,
      port_akhir: 1,
    });

    expect(rows.map(r => r.port_str)).toEqual(['1/1/0', '1/1/1', '1/2/0', '1/2/1']);
  });

  it('detects the longest ODC match from nama_lop using hyphen and space tolerant matching', () => {
    const detected = detectOdcName('RDR JPP PT3 EXPAND ARK FKF', ['ARK-FK', 'ARK-FKF']);
    expect(detected).toBe('ARK-FKF');
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `rtk npx vitest run tests/topology-allocation.test.ts`

Expected: FAIL because `src/lib/topology-allocation.ts` does not exist.

- [ ] **Step 3: Implement the helper module**

Create `src/lib/topology-allocation.ts` with:

```ts
export interface AllocationInput {
  aanwijzing_id: string;
  nama_lop: string;
  id_ihld: string;
  area: string;
  sto: string;
  olt_name: string;
  odc_name: string;
  frame: number;
  slot_awal: number;
  slot_akhir: number;
  port_awal: number;
  port_akhir: number;
}

export interface AllocationRow extends AllocationInput {
  slot: number;
  port: number;
  port_str: string;
}

export function buildPortAllocations(input: AllocationInput): AllocationRow[] {
  const slotStart = Math.min(input.slot_awal, input.slot_akhir);
  const slotEnd = Math.max(input.slot_awal, input.slot_akhir);
  const portStart = Math.min(input.port_awal, input.port_akhir);
  const portEnd = Math.max(input.port_awal, input.port_akhir);
  const rows: AllocationRow[] = [];

  for (let slot = slotStart; slot <= slotEnd; slot += 1) {
    for (let port = portStart; port <= portEnd; port += 1) {
      rows.push({ ...input, slot, port, port_str: `${input.frame}/${slot}/${port}` });
    }
  }

  return rows;
}

function compact(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, '');
}

export function detectOdcName(namaLop: string, odcNames: string[]): string {
  const normalizedName = compact(namaLop);
  return odcNames
    .filter(name => normalizedName.includes(compact(name)))
    .sort((a, b) => compact(b).length - compact(a).length)[0] ?? '';
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `rtk npx vitest run tests/topology-allocation.test.ts`

Expected: PASS.

## Task 2: Database and Repository Layer

**Files:**
- Modify: `src/lib/migrations.ts`
- Create: `src/repositories/TopologyAllocationRepository.ts`
- Modify: `src/repositories/OltOdcRepository.ts`
- Test: `tests/topology-allocation.test.ts`

- [ ] **Step 1: Add migration for AANWIJZING fields and `topology_allocations`**

Add migration `id: 16`:

```ts
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
}
```

- [ ] **Step 2: Create repository for allocation reads/writes and conflicts**

Create `src/repositories/TopologyAllocationRepository.ts` with methods:

```ts
import { db } from '../lib/db';
import type { AllocationRow } from '@/lib/topology-allocation';

export interface AllocationConflict {
  source: 'master' | 'allocation';
  aanwijzing_id?: string;
  olt_name: string;
  frame: number;
  slot: number;
  port: number;
  port_str: string;
  odc_name: string;
}

export class TopologyAllocationRepository {
  static findAll() {
    return db.prepare('SELECT * FROM topology_allocations ORDER BY area, sto, olt_name, slot, port').all();
  }

  static findExistingConflicts(rows: AllocationRow[], currentAanwijzingId: string): AllocationConflict[] {
    const conflicts: AllocationConflict[] = [];
    const master = db.prepare('SELECT odc_name FROM olt_odc_map WHERE olt_name = ? AND frame = ? AND slot = ? AND port = ? LIMIT 1');
    const allocated = db.prepare('SELECT aanwijzing_id, odc_name FROM topology_allocations WHERE olt_name = ? AND frame = ? AND slot = ? AND port = ? AND aanwijzing_id != ? LIMIT 1');

    for (const row of rows) {
      const masterHit = master.get(row.olt_name, String(row.frame), row.slot, row.port) as { odc_name: string } | undefined;
      if (masterHit) conflicts.push({ source: 'master', olt_name: row.olt_name, frame: row.frame, slot: row.slot, port: row.port, port_str: row.port_str, odc_name: masterHit.odc_name });

      const allocationHit = allocated.get(row.olt_name, row.frame, row.slot, row.port, currentAanwijzingId) as { aanwijzing_id: string; odc_name: string } | undefined;
      if (allocationHit) conflicts.push({ source: 'allocation', aanwijzing_id: allocationHit.aanwijzing_id, olt_name: row.olt_name, frame: row.frame, slot: row.slot, port: row.port, port_str: row.port_str, odc_name: allocationHit.odc_name });
    }

    return conflicts;
  }

  static replaceForAanwijzing(aanwijzingId: string, rows: AllocationRow[], overwrite: boolean) {
    const insert = db.prepare(`
      INSERT OR ${overwrite ? 'REPLACE' : 'ABORT'} INTO topology_allocations (
        aanwijzing_id, nama_lop, id_ihld, area, sto, olt_name, odc_name, frame, slot, port, port_str, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    db.prepare('DELETE FROM topology_allocations WHERE aanwijzing_id = ?').run(aanwijzingId);
    for (const row of rows) {
      insert.run(row.aanwijzing_id, row.nama_lop, row.id_ihld, row.area, row.sto, row.olt_name, row.odc_name, row.frame, row.slot, row.port, row.port_str);
    }
  }

  static deleteForAanwijzing(aanwijzingId: string) {
    return db.prepare('DELETE FROM topology_allocations WHERE aanwijzing_id = ?').run(aanwijzingId);
  }
}
```

- [ ] **Step 3: Add OLT/ODC metadata helpers**

Modify `src/repositories/OltOdcRepository.ts` to expose:

```ts
static getDistinctOdcNames(): string[] {
  return db.prepare('SELECT DISTINCT odc_name FROM olt_odc_map WHERE odc_name != "" ORDER BY odc_name').all().map((row) => (row as { odc_name: string }).odc_name);
}

static getOlts(area?: string, sto?: string): { area: string; sto: string; olt_name: string }[] {
  if (area && sto) {
    return db.prepare('SELECT DISTINCT area, sto, olt_name FROM olt_odc_map WHERE area = ? AND sto = ? ORDER BY olt_name').all(area, sto) as { area: string; sto: string; olt_name: string }[];
  }
  return db.prepare('SELECT DISTINCT area, sto, olt_name FROM olt_odc_map ORDER BY area, sto, olt_name').all() as { area: string; sto: string; olt_name: string }[];
}
```

- [ ] **Step 4: Run tests**

Run: `rtk npx vitest run tests/topology-allocation.test.ts`

Expected: PASS.

## Task 3: API Transaction Flow

**Files:**
- Modify: `src/repositories/AanwijzingRepository.ts`
- Modify: `src/repositories/ProjectRepository.ts`
- Modify: `src/app/api/aanwijzing/route.ts`
- Modify: `src/lib/validation.ts`
- Test: `tests/boq-json-submit.test.ts`

- [ ] **Step 1: Extend validation and project select data**

Add `area`, `sto`, `odc_name`, and `allow_overwrite` to `aanwijzingSchema`; update `ProjectRepository.getForSelect()` return shape to include `area` and `sto`.

- [ ] **Step 2: Add transaction method for AANWIJZING and allocations**

Add `AanwijzingRepository.upsertWithAllocations(data, allocations, overwrite)` that wraps `AanwijzingRepository.upsert` and `TopologyAllocationRepository.replaceForAanwijzing` in one `db.transaction`.

- [ ] **Step 3: API conflict behavior**

In `POST /api/aanwijzing`, build allocation rows only when area, sto, gpon, odc_name, frame, slot, and port values are complete. Check conflicts before transaction:

- master conflicts always return HTTP 409 with `code: "TOPOLOGY_MASTER_CONFLICT"`.
- allocation conflicts return HTTP 409 with `code: "TOPOLOGY_ALLOCATION_CONFLICT"` unless `allow_overwrite` is true.
- with overwrite true, replace conflicting allocation rows and save the submitted AANWIJZING.

- [ ] **Step 4: Extend API tests**

Add tests that:

- seeding a master `olt_odc_map` row makes AANWIJZING submit return 409.
- seeding an allocation conflict returns 409 without overwrite.
- repeating submit with `allow_overwrite: true` succeeds and stores the new allocation.

Run: `rtk npx vitest run tests/boq-json-submit.test.ts tests/topology-allocation.test.ts`

Expected: PASS.

## Task 4: Topology Merge and Visual Display

**Files:**
- Modify: `src/lib/topology.ts`
- Modify: `src/components/features/topology/NetworkTopology.tsx`

- [ ] **Step 1: Extend topology types**

Add `source: 'master' | 'allocation'`, `nama_lop?: string`, `id_ihld?: string`, and `aanwijzing_id?: string` to `PortEntry`.

- [ ] **Step 2: Merge allocation rows**

Update `getNetworkHierarchy()` so it appends `TopologyAllocationRepository.findAll()` rows into the same hierarchy as `olt_odc_map`, keeping `source: 'master'` for imported rows and `source: 'allocation'` for AANWIJZING rows.

- [ ] **Step 3: Color allocation ports**

In `NetworkTopology.tsx`, render allocation ports with amber/indigo styling distinct from master emerald ports; update the legend to include “AANWIJZING Allocation”.

- [ ] **Step 4: Typecheck**

Run: `rtk npm run typecheck`

Expected: PASS.

## Task 5: AANWIJZING Form UX

**Files:**
- Modify: `src/app/(main)/aanwijzing/page.tsx`
- Optional Modify: `src/app/api/aanwijzing/route.ts` GET payload

- [ ] **Step 1: Extend form data and project option types**

Add `area`, `sto`, `odc_name`, and `allow_overwrite` to form state. Project options include `area` and `sto`.

- [ ] **Step 2: Add area/STO and GPON dropdowns**

Build unique area/STO options from topology metadata returned by `GET /api/aanwijzing`. GPON dropdown is filtered by selected area and STO and stores `olt_name` in `formData.gpon`.

- [ ] **Step 3: Add ODC auto-detection**

When `nama_lop` changes, run the same longest-match logic against `odcNames` from API. If no match is found, show manual `ODC` input. If match is found, prefill `odc_name` while still allowing correction.

- [ ] **Step 4: Add overwrite retry**

When POST returns `TOPOLOGY_ALLOCATION_CONFLICT`, show a warning and a button to retry with `allow_overwrite: true`.

- [ ] **Step 5: Smoke-check manually**

Run: `rtk npm run typecheck`

Expected: PASS.

## Task 6: Final Verification

**Files:**
- All modified files

- [ ] **Step 1: Run focused tests**

Run: `rtk npx vitest run tests/topology-allocation.test.ts tests/boq-json-submit.test.ts`

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run: `rtk npm run typecheck`

Expected: PASS.

- [ ] **Step 3: Run targeted lint**

Run: `rtk npx eslint "src/app/(main)/aanwijzing/page.tsx" "src/app/api/aanwijzing/route.ts" "src/lib/topology.ts" "src/lib/topology-allocation.ts" "src/repositories/AanwijzingRepository.ts" "src/repositories/TopologyAllocationRepository.ts" "src/repositories/OltOdcRepository.ts" "src/repositories/ProjectRepository.ts" "src/components/features/topology/NetworkTopology.tsx"`

Expected: no new errors in modified files.

## Self-Review

- Spec coverage: covers GPON dropdown, area/STO selection, ODC detection/manual fallback, conflict rules, overwrite rule, edit/delete allocation lifecycle, and topology visual distinction.
- Placeholder scan: no deferred implementation placeholders remain; each task names concrete files, functions, and commands.
- Type consistency: allocation fields use `olt_name` internally while the existing AANWIJZING field remains `gpon` for UI/API compatibility.
