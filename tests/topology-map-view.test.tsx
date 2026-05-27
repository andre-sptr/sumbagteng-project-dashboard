import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TopologyMapView from '../src/components/features/topology/TopologyMapView';
import type { TopologyHierarchy } from '../src/lib/topology';
import type { TopologyMapContext } from '../src/lib/topology-map';

const leafletMocks = vi.hoisted(() => ({
  fitBounds: vi.fn(),
  setView: vi.fn(),
}));

vi.mock('react-leaflet', () => ({
  CircleMarker: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  MapContainer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Polyline: () => <div data-testid="trace-line" />,
  Popup: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  TileLayer: () => <div />,
  useMap: () => leafletMocks,
}));

const topology: TopologyHierarchy = {
  AMK: {},
};

const mapContext: TopologyMapContext = {
  nodes: [],
  traces: [],
  missingLocations: [],
};

const traceMapContext: TopologyMapContext = {
  nodes: [
    {
      id: 'core:::SUMBAGTENG',
      entityType: 'core',
      name: 'SUMBAGTENG',
      area: '',
      sto: '',
      latitude: -0.9,
      longitude: 100.3,
      confidence: 'verified',
    },
    {
      id: 'sto:AMK:AMK-01:AMK-01',
      entityType: 'sto',
      name: 'AMK-01',
      area: 'AMK',
      sto: 'AMK-01',
      latitude: -0.8,
      longitude: 100.4,
      confidence: 'verified',
    },
    {
      id: 'olt:AMK:AMK-01:GPON00-D1-AMK-2',
      entityType: 'olt',
      name: 'GPON00-D1-AMK-2',
      area: 'AMK',
      sto: 'AMK-01',
      latitude: -0.7,
      longitude: 100.5,
      confidence: 'verified',
    },
    {
      id: 'odc:AMK:AMK-01:ODC-AMK-FQ',
      entityType: 'odc',
      name: 'ODC-AMK-FQ',
      area: 'AMK',
      sto: 'AMK-01',
      latitude: -0.6,
      longitude: 100.6,
      confidence: 'verified',
    },
    {
      id: 'odc:AMK:AMK-01:ODC-AMK-FB',
      entityType: 'odc',
      name: 'ODC-AMK-FB',
      area: 'AMK',
      sto: 'AMK-01',
      latitude: -0.5,
      longitude: 100.7,
      confidence: 'verified',
    },
  ],
  traces: [
    {
      id: 'trace-1',
      area: 'AMK',
      sto: 'AMK-01',
      oltName: 'GPON00-D1-AMK-2',
      odcName: 'ODC-AMK-FQ',
      portStr: '1/0/1/4',
      source: 'master',
      pathNodeIds: [
        'core:::SUMBAGTENG',
        'sto:AMK:AMK-01:AMK-01',
        'olt:AMK:AMK-01:GPON00-D1-AMK-2',
        'odc:AMK:AMK-01:ODC-AMK-FQ',
      ],
    },
    {
      id: 'trace-2',
      area: 'AMK',
      sto: 'AMK-01',
      oltName: 'GPON00-D1-AMK-2',
      odcName: 'ODC-AMK-FB',
      portStr: '1/0/1/6',
      source: 'allocation',
      namaLop: 'Project AMK',
      pathNodeIds: [
        'core:::SUMBAGTENG',
        'sto:AMK:AMK-01:AMK-01',
        'olt:AMK:AMK-01:GPON00-D1-AMK-2',
        'odc:AMK:AMK-01:ODC-AMK-FB',
      ],
    },
  ],
  missingLocations: [
    { entityType: 'odc', name: 'ODC-AMK-MISSING', area: 'AMK', sto: 'AMK-01' },
    { entityType: 'olt', name: 'OLT-AMK-MISSING', area: 'AMK', sto: 'AMK-01' },
  ],
};

describe('TopologyMapView search status', () => {
  beforeEach(() => {
    leafletMocks.fitBounds.mockClear();
    leafletMocks.setView.mockClear();
  });

  it('shows search as toolbar filter state instead of a map input placeholder', () => {
    render(
      <TopologyMapView
        topology={topology}
        mapContext={mapContext}
        searchQuery=""
        selectedArea=""
        selectedSto=""
      />
    );

    expect(screen.getByText('Filter dari Search Utama')).toBeInTheDocument();
    expect(screen.getByText('Belum ada filter pencarian')).toBeInTheDocument();
    expect(screen.queryByText('Cari ODC, OLT, STO, Port...')).not.toBeInTheDocument();
  });

  it('starts focused on one trace, shows an inspector, and keeps missing locations compact', () => {
    render(
      <TopologyMapView
        topology={topology}
        mapContext={traceMapContext}
        searchQuery=""
        selectedArea=""
        selectedSto=""
      />
    );

    expect(screen.getByText('Selected Trace')).toBeInTheDocument();
    expect(screen.getAllByText('ODC-AMK-FQ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1/0/1/4').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('trace-line')).toHaveLength(1);

    expect(screen.getByText('2 lokasi belum verified')).toBeInTheDocument();
    expect(screen.queryByText('ODC-AMK-MISSING')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show all traces' }));

    expect(screen.getAllByTestId('trace-line')).toHaveLength(2);
  });

  it('filters trace results by source inside Map Trace', () => {
    render(
      <TopologyMapView
        topology={topology}
        mapContext={traceMapContext}
        searchQuery=""
        selectedArea=""
        selectedSto=""
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Allocation traces' }));

    expect(screen.getByText('1 route tersedia')).toBeInTheDocument();
    expect(screen.getAllByText('ODC-AMK-FB').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /ODC-AMK-FQ/ })).not.toBeInTheDocument();
  });

  it('focuses the map on a route node from the selected trace inspector', async () => {
    render(
      <TopologyMapView
        topology={topology}
        mapContext={traceMapContext}
        searchQuery=""
        selectedArea=""
        selectedSto=""
      />
    );
    leafletMocks.fitBounds.mockClear();
    leafletMocks.setView.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Focus OLT GPON00-D1-AMK-2' }));

    await waitFor(() => {
      expect(leafletMocks.setView).toHaveBeenCalledWith([-0.7, 100.5], 13);
    });
  });

  it('collapses the trace panel and groups trace results by dimension', () => {
    render(
      <TopologyMapView
        topology={topology}
        mapContext={traceMapContext}
        searchQuery=""
        selectedArea=""
        selectedSto=""
      />
    );

    expect(screen.getByText('Grouped by OLT')).toBeInTheDocument();
    expect(screen.getAllByText('GPON00-D1-AMK-2').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Group by ODC' }));

    expect(screen.getByText('Grouped by ODC')).toBeInTheDocument();
    expect(screen.getAllByText('ODC-AMK-FB').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Collapse trace panel' }));

    expect(screen.getByRole('button', { name: 'Expand trace panel' })).toBeInTheDocument();
  });

  it('compares multiple traces without enabling show all', () => {
    render(
      <TopologyMapView
        topology={topology}
        mapContext={traceMapContext}
        searchQuery=""
        selectedArea=""
        selectedSto=""
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Compare traces' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Compare ODC-AMK-FQ 1/0/1/4' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Compare ODC-AMK-FB 1/0/1/6' }));

    expect(screen.getByText('2 dibandingkan')).toBeInTheDocument();
    expect(screen.getAllByTestId('trace-line')).toHaveLength(2);
  });

  it('filters missing locations by entity type', () => {
    render(
      <TopologyMapView
        topology={topology}
        mapContext={traceMapContext}
        searchQuery=""
        selectedArea=""
        selectedSto=""
      />
    );

    expect(screen.getByText('2 lokasi belum verified')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'ODC missing locations' }));

    expect(screen.getByText('1 lokasi belum verified')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Detail' }));
    expect(screen.getByText('ODC - ODC-AMK-MISSING')).toBeInTheDocument();
    expect(screen.queryByText('OLT - OLT-AMK-MISSING')).not.toBeInTheDocument();
  });
});
