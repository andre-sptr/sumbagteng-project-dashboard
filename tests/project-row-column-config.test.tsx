import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Project } from '../src/types/database';
import { ProjectRow } from '../src/components/features/dashboard/ProjectRow';

const baseProject: Project = {
  uid: 'IHLD-1::BATCH-1',
  id_ihld: 'IHLD-1',
  batch_program: 'BATCH-1',
  nama_lop: 'LOP Config Test',
  region: 'SUMBAGTENG',
  status: '7. GOLIVE',
  sub_status: 'Done',
  full_data: '[]',
  last_changed_at: '2026-01-01T00:00:00Z',
  history: '[]',
  area: 'AREA',
  branch: 'BRANCH',
  mitra: 'MITRA',
  sto: 'STO',
  odp_planned: 0,
  port_planned: 0,
  port_realized: 0,
  golive_target: null,
  golive_actual: null,
};

describe('ProjectRow column configuration', () => {
  it('renders raw column labels and dashboard date from the runtime column config', () => {
    const fullData: unknown[] = [];
    fullData[1] = 'IHLD-1';
    fullData[3] = '15/01/2026';
    fullData[5] = '7. GOLIVE';
    fullData[30] = '';

    const columnConfig = [
      {
        field_key: 'ID_IHLD',
        label: 'ID dari Config',
        header_text: 'ID-IHLD',
        col_index: 1,
        sort_order: 0,
      },
      {
        field_key: 'TANGGAL_GOLIVE',
        label: 'Tanggal dari Config',
        header_text: 'Tanggal Live',
        col_index: 3,
        sort_order: 1,
      },
      {
        field_key: 'STATUS',
        label: 'Status dari Config',
        header_text: 'Status',
        col_index: 5,
        sort_order: 2,
      },
    ];

    render(
      <table>
        <tbody>
          <ProjectRow
            project={{ ...baseProject, full_data: JSON.stringify(fullData) }}
            index={0}
            isExpanded
            onToggle={() => undefined}
            getStatusColor={() => ''}
            columnConfig={columnConfig}
          />
        </tbody>
      </table>
    );

    expect(screen.getAllByText('15 Januari 2026')).toHaveLength(2);
    expect(screen.getByText('ID dari Config')).toBeInTheDocument();
    expect(screen.getByText('Tanggal dari Config')).toBeInTheDocument();
    expect(screen.getByText('Status dari Config')).toBeInTheDocument();

    const rawPanel = screen.getByText('Data Kolom Mentah (Raw)').closest('div');
    expect(rawPanel).not.toBeNull();
    expect(within(rawPanel as HTMLElement).queryByText('REGIONAL')).not.toBeInTheDocument();
  });
});
