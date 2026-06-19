# Sidebar Project Restructure + NodeB/HEM Scaffolding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the sidebar by project (JPP/NodeB/HEM + Monitoring + Settings), add placeholder pages for NodeB & HEM, and fix the KPI Report and Administration naming.

**Architecture:** Frontend navigation only. A new shared `<ComingSoon>` component backs 12 thin placeholder pages under `/nodeb/*` and `/hem/*`. The `Sidebar.tsx` `NAV_GROUPS` data array is rewritten; `(main)/layout.tsx` `PAGE_META` gains the new routes and drops Engineering. Three obsolete KPI stub routes are deleted. No data-model, repository, or API changes.

**Tech Stack:** Next.js 16 (App Router) + React 19, TypeScript, Tailwind v4, lucide-react@1.11.0, Vitest + @testing-library.

## Global Constraints

- **No** changes to API routes, repositories, database, or business logic. Navigation/presentation only.
- JPP keeps its current routes (`/projects`, `/boq`, `/aanwijzing`, `/ut`, `/report`, `/kpi-report/jpp`) — do not move or rename them.
- lucide-react@1.11.0 is installed and **does** export `FolderKanban` and `Construction` (verified).
- Placeholder page titles use the exact format `"<Page> — <Project>"` with an em dash `—` (U+2014), e.g. `"BoQ Plan — NodeB"`.
- Each page file is a server component (no `'use client'`), default-exporting a uniquely-named function.
- Work directly on `main` (this repo's established workflow; reconfirm consent at execution start). The working tree has UNRELATED staged `docs/` deletions — never stage/commit them. Commit only the files each task lists, using explicit pathspecs (`git commit -- <paths>`). Paths containing `(main)` must be quoted.
- Every commit message ends with the trailer (second `-m`): `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Verification commands: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:run`.

---

### Task 1: Shared `ComingSoon` placeholder component (TDD)

**Files:**
- Create: `src/components/ui/ComingSoon.tsx`
- Test: `tests/coming-soon.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  // default export
  export default function ComingSoon(props: { title: string; description?: string }): JSX.Element
  ```
  Renders the `title`, and `description` if given, otherwise the literal text `Halaman ini belum tersedia.`

- [ ] **Step 1: Write the failing test**

Create `tests/coming-soon.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ComingSoon from '../src/components/ui/ComingSoon';

describe('ComingSoon', () => {
  it('renders the title and the default message', () => {
    render(<ComingSoon title="BoQ Plan — NodeB" />);
    expect(screen.getByText('BoQ Plan — NodeB')).toBeInTheDocument();
    expect(screen.getByText('Halaman ini belum tersedia.')).toBeInTheDocument();
  });

  it('renders a custom description when provided', () => {
    render(<ComingSoon title="Report — HEM" description="Segera hadir" />);
    expect(screen.getByText('Segera hadir')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- tests/coming-soon.test.tsx`
Expected: FAIL — cannot resolve module `../src/components/ui/ComingSoon`.

- [ ] **Step 3: Implement the component**

Create `src/components/ui/ComingSoon.tsx`:

```tsx
// Placeholder shown on routes whose functionality is not built yet.
import { Construction } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description?: string;
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-5">
        <Construction size={32} />
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-md">
        {description ?? 'Halaman ini belum tersedia.'}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- tests/coming-soon.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add ComingSoon placeholder component" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>" -- src/components/ui/ComingSoon.tsx tests/coming-soon.test.tsx
```

---

### Task 2: NodeB & HEM placeholder pages + JPP KPI page

Create 12 placeholder pages and convert the JPP KPI stub to use `ComingSoon`. Each page is a thin wrapper. No new tests (trivial wrappers; the component is tested in Task 1). Verify by building.

**Files:**
- Create (12): the page files listed below.
- Modify: `src/app/(main)/kpi-report/jpp/page.tsx`

**Interfaces:**
- Consumes: `ComingSoon` (Task 1), imported as `import ComingSoon from '@/components/ui/ComingSoon';`.
- Produces: routes `/nodeb/*`, `/hem/*` (consumed by the sidebar in Task 3).

- [ ] **Step 1: Create the 6 NodeB pages**

Create `src/app/(main)/nodeb/projects/page.tsx`:
```tsx
import ComingSoon from '@/components/ui/ComingSoon';

export default function NodebProjectsPage() {
  return <ComingSoon title="Projects Data — NodeB" />;
}
```

Create `src/app/(main)/nodeb/boq/page.tsx`:
```tsx
import ComingSoon from '@/components/ui/ComingSoon';

export default function NodebBoqPage() {
  return <ComingSoon title="BoQ Plan — NodeB" />;
}
```

Create `src/app/(main)/nodeb/aanwijzing/page.tsx`:
```tsx
import ComingSoon from '@/components/ui/ComingSoon';

export default function NodebAanwijzingPage() {
  return <ComingSoon title="AANWIJZING — NodeB" />;
}
```

Create `src/app/(main)/nodeb/ut/page.tsx`:
```tsx
import ComingSoon from '@/components/ui/ComingSoon';

export default function NodebUtPage() {
  return <ComingSoon title="Rekap UT — NodeB" />;
}
```

Create `src/app/(main)/nodeb/report/page.tsx`:
```tsx
import ComingSoon from '@/components/ui/ComingSoon';

export default function NodebReportPage() {
  return <ComingSoon title="Report — NodeB" />;
}
```

Create `src/app/(main)/nodeb/kpi-report/page.tsx`:
```tsx
import ComingSoon from '@/components/ui/ComingSoon';

export default function NodebKpiReportPage() {
  return <ComingSoon title="KPI Report — NodeB" />;
}
```

- [ ] **Step 2: Create the 6 HEM pages**

Create `src/app/(main)/hem/projects/page.tsx`:
```tsx
import ComingSoon from '@/components/ui/ComingSoon';

export default function HemProjectsPage() {
  return <ComingSoon title="Projects Data — HEM" />;
}
```

Create `src/app/(main)/hem/boq/page.tsx`:
```tsx
import ComingSoon from '@/components/ui/ComingSoon';

export default function HemBoqPage() {
  return <ComingSoon title="BoQ Plan — HEM" />;
}
```

Create `src/app/(main)/hem/aanwijzing/page.tsx`:
```tsx
import ComingSoon from '@/components/ui/ComingSoon';

export default function HemAanwijzingPage() {
  return <ComingSoon title="AANWIJZING — HEM" />;
}
```

Create `src/app/(main)/hem/ut/page.tsx`:
```tsx
import ComingSoon from '@/components/ui/ComingSoon';

export default function HemUtPage() {
  return <ComingSoon title="Rekap UT — HEM" />;
}
```

Create `src/app/(main)/hem/report/page.tsx`:
```tsx
import ComingSoon from '@/components/ui/ComingSoon';

export default function HemReportPage() {
  return <ComingSoon title="Report — HEM" />;
}
```

Create `src/app/(main)/hem/kpi-report/page.tsx`:
```tsx
import ComingSoon from '@/components/ui/ComingSoon';

export default function HemKpiReportPage() {
  return <ComingSoon title="KPI Report — HEM" />;
}
```

- [ ] **Step 3: Convert the JPP KPI stub**

Replace the entire contents of `src/app/(main)/kpi-report/jpp/page.tsx` (currently `export default function JppKpiReportPage() { return null; }`) with:
```tsx
import ComingSoon from '@/components/ui/ComingSoon';

export default function JppKpiReportPage() {
  return <ComingSoon title="KPI Report — JPP" />;
}
```

- [ ] **Step 4: Verify lint, types, and build**

Run: `npm run lint && npm run typecheck && npm run build`
Expected: all succeed; the build output lists the new routes `/nodeb/...` and `/hem/...` (and `/kpi-report/jpp`).

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add NodeB and HEM placeholder pages" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>" -- "src/app/(main)/nodeb" "src/app/(main)/hem" "src/app/(main)/kpi-report/jpp/page.tsx"
```

---

### Task 3: Sidebar restructure + Topbar metadata + delete obsolete stubs

Rewrite the sidebar navigation, update the Topbar `PAGE_META`, and delete the three obsolete KPI stub routes.

**Files:**
- Modify: `src/components/layout/Sidebar.tsx` (imports + `NAV_GROUPS`)
- Modify: `src/app/(main)/layout.tsx` (`PAGE_META`)
- Delete: `src/app/(main)/kpi-report/nodeb/page.tsx`, `src/app/(main)/kpi-report/hem/page.tsx`, `src/app/(main)/kpi-report/engineering/page.tsx`

**Interfaces:**
- Consumes: routes from Task 2 (`/nodeb/*`, `/hem/*`).
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Swap the unused icon import for `FolderKanban`**

In `src/components/layout/Sidebar.tsx`, the import block (lines 7-27) includes `  ClipboardList,` which becomes unused after this task (ESLint would flag it). Replace that single line:

Change:
```tsx
  ClipboardList,
```
to:
```tsx
  FolderKanban,
```

(All other imported icons remain used: `LayoutDashboard`, `Database`, `X`, `Activity`, `FileText`, `Receipt`, `BarChart3`, `Settings`, `Columns3`, `Network`, `RefreshCw`, `ClipboardCheck`, `TrendingUp`, `Megaphone`, `FileSearch`, `ChevronDown`, `ChevronRight`.)

- [ ] **Step 2: Rewrite `NAV_GROUPS`**

Replace the entire `NAV_GROUPS` array (currently lines 52-91, the four groups Project Tracking / Monitoring / KPI Report / Administration) with:

```tsx
const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Project JPP',
    icon: FolderKanban,
    items: [
      { href: '/projects', label: 'Projects Data', icon: Database },
      { href: '/boq', label: 'BoQ Plan', icon: Receipt },
      { href: '/aanwijzing', label: 'AANWIJZING', icon: Megaphone },
      { href: '/ut', label: 'Rekap UT', icon: ClipboardCheck },
      { href: '/report', label: 'Report', icon: BarChart3 },
      { href: '/kpi-report/jpp', label: 'KPI Report', icon: FileText },
    ],
  },
  {
    label: 'Project NodeB',
    icon: FolderKanban,
    items: [
      { href: '/nodeb/projects', label: 'Projects Data', icon: Database },
      { href: '/nodeb/boq', label: 'BoQ Plan', icon: Receipt },
      { href: '/nodeb/aanwijzing', label: 'AANWIJZING', icon: Megaphone },
      { href: '/nodeb/ut', label: 'Rekap UT', icon: ClipboardCheck },
      { href: '/nodeb/report', label: 'Report', icon: BarChart3 },
      { href: '/nodeb/kpi-report', label: 'KPI Report', icon: FileText },
    ],
  },
  {
    label: 'Project HEM',
    icon: FolderKanban,
    items: [
      { href: '/hem/projects', label: 'Projects Data', icon: Database },
      { href: '/hem/boq', label: 'BoQ Plan', icon: Receipt },
      { href: '/hem/aanwijzing', label: 'AANWIJZING', icon: Megaphone },
      { href: '/hem/ut', label: 'Rekap UT', icon: ClipboardCheck },
      { href: '/hem/report', label: 'Report', icon: BarChart3 },
      { href: '/hem/kpi-report', label: 'KPI Report', icon: FileText },
    ],
  },
  {
    label: 'Monitoring',
    icon: Activity,
    items: [
      { href: '/topology', label: 'Network Topology', icon: Network },
      { href: '/boq-tracking', label: 'BoQ Tracking', icon: TrendingUp },
      { href: '/cek-boq', label: 'Cek BoQ', icon: FileSearch },
    ],
  },
  {
    label: 'Settings',
    icon: Settings,
    items: [
      { href: '/settings/sync', label: 'Synchronization', icon: RefreshCw },
      { href: '/settings/columns', label: 'Column Config', icon: Columns3 },
    ],
  },
];
```

- [ ] **Step 3: Update `PAGE_META` in the layout**

In `src/app/(main)/layout.tsx`, replace the four KPI entries (currently lines 42-57: `/kpi-report/jpp`, `/kpi-report/nodeb`, `/kpi-report/hem`, `/kpi-report/engineering`) with the JPP entry plus the 12 new project routes:

```tsx
  '/kpi-report/jpp': {
    title: 'KPI Report — JPP',
    subtitle: '',
  },
  '/nodeb/projects': { title: 'Projects Data — NodeB', subtitle: '' },
  '/nodeb/boq': { title: 'BoQ Plan — NodeB', subtitle: '' },
  '/nodeb/aanwijzing': { title: 'AANWIJZING — NodeB', subtitle: '' },
  '/nodeb/ut': { title: 'Rekap UT — NodeB', subtitle: '' },
  '/nodeb/report': { title: 'Report — NodeB', subtitle: '' },
  '/nodeb/kpi-report': { title: 'KPI Report — NodeB', subtitle: '' },
  '/hem/projects': { title: 'Projects Data — HEM', subtitle: '' },
  '/hem/boq': { title: 'BoQ Plan — HEM', subtitle: '' },
  '/hem/aanwijzing': { title: 'AANWIJZING — HEM', subtitle: '' },
  '/hem/ut': { title: 'Rekap UT — HEM', subtitle: '' },
  '/hem/report': { title: 'Report — HEM', subtitle: '' },
  '/hem/kpi-report': { title: 'KPI Report — HEM', subtitle: '' },
```

(Leave the `/dashboard`, `/projects`, `/boq`, `/boq-tracking`, `/cek-boq`, `/aanwijzing`, `/ut`, `/report`, and `/topology` entries unchanged.)

- [ ] **Step 4: Delete the three obsolete KPI stub routes**

Run:
```bash
git rm "src/app/(main)/kpi-report/nodeb/page.tsx" "src/app/(main)/kpi-report/hem/page.tsx" "src/app/(main)/kpi-report/engineering/page.tsx"
```
Expected: three files staged for deletion. (Git removes the now-empty folders automatically.)

- [ ] **Step 5: Verify lint, types, build, and tests**

Run: `npm run lint && npm run typecheck && npm run build && npm run test:run`
Expected: lint clean (no unused `ClipboardList`); typecheck clean; build lists the new routes and no longer lists `/kpi-report/nodeb`, `/kpi-report/hem`, `/kpi-report/engineering`; tests 123/123 pass.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: restructure sidebar by project, rename Settings, drop Engineering" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>" -- "src/components/layout/Sidebar.tsx" "src/app/(main)/layout.tsx" "src/app/(main)/kpi-report/nodeb/page.tsx" "src/app/(main)/kpi-report/hem/page.tsx" "src/app/(main)/kpi-report/engineering/page.tsx"
```

---

### Task 4: Full verification

- [ ] **Step 1: Run the whole gate**

Run: `npm run test:run && npm run lint && npm run typecheck && npm run build`
Expected: all green, 123/123 tests, no regressions.

- [ ] **Step 2: Manual smoke test (`npm run dev`)**

- Sidebar shows five groups: **Project JPP**, **Project NodeB**, **Project HEM**, **Monitoring**, **Settings** (no "Project Tracking", "KPI Report", or "Administration" group).
- Project JPP items open the existing working pages (`/boq`, `/ut`, `/aanwijzing`, `/projects`, `/report`); `/kpi-report/jpp` shows the ComingSoon placeholder.
- Every NodeB and HEM item navigates to a ComingSoon placeholder with the correct project-qualified Topbar title (e.g. "BoQ Plan — NodeB").
- Opening a NodeB/HEM route auto-expands its project group and highlights the active item.
- Monitoring contains Network Topology, BoQ Tracking, Cek BoQ (label "Cek BoQ", not "Cek BOQ").
- Settings contains Synchronization and Column Config.
- Visiting `/kpi-report/engineering` (deleted) returns Next's 404.

## Self-Review

**Spec coverage:**
- Sidebar restructured by project, JPP consolidated → Task 3 Step 2. ✓
- NodeB/HEM placeholder pages → Task 2 (+ shared `ComingSoon`, Task 1). ✓
- KPI Report group dissolved, per-project KPI items → Task 3 Step 2 (items) + Task 2 (pages). ✓
- Engineering removed (sidebar + route + PAGE_META) → Task 3 Steps 2, 3, 4. ✓
- Administration → Settings; Configuration → Column Config → Task 3 Step 2. ✓
- Cek BOQ → Cek BoQ casing → Task 3 Step 2. ✓
- Global group "Monitoring" (Topology, BoQ Tracking, Cek BoQ); Report moved into Project JPP → Task 3 Step 2. ✓
- PAGE_META updated for new routes + Engineering dropped → Task 3 Step 3. ✓
- JPP KPI stub uses ComingSoon → Task 2 Step 3. ✓
- No data/API/repository changes → honored throughout. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete file contents or exact replacement text. The 12 pages are each fully written out (not "similar to"). ✓

**Type consistency:** `ComingSoon` default export with props `{ title: string; description?: string }` defined in Task 1 and imported the same way in all of Task 2. `NavGroup`/`NavItem` shapes in Task 3 match the existing interfaces in `Sidebar.tsx` (`label`, `icon`, `items` / `href`, `label`, `icon`). Icon `FolderKanban` added to imports before use. ✓
