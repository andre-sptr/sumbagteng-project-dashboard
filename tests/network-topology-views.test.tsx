import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NetworkTopology from '../src/components/features/topology/NetworkTopology';
import type { TopologyHierarchy } from '../src/lib/topology';

vi.mock('next/dynamic', () => ({
  default: () => function MockTopologyMapView() {
    return <div data-testid="topology-map-view">Map Trace View</div>;
  },
}));

const topology: TopologyHierarchy = {
  AMK: {
    'AMK-01': {
      'GPON00-D1-AMK-2': {
        name: 'GPON00-D1-AMK-2',
        type: 'OLT',
        oltType: 'big',
        portBase: 0,
        status: 'LIVE',
        plannedPorts: 16,
        realizedPorts: 1,
        maxSlot: 17,
        slots: [
          {
            slot: 1,
            frame: '1',
            maxPort: 15,
            ports: [
              null,
              {
                port: 1,
                odc_name: 'ODC-AMK-FQ',
                port_str: '1/1/1',
                source: 'master',
              },
            ],
          },
        ],
      },
    },
  },
};

describe('NetworkTopology view modes', () => {
  it('keeps hierarchy as the default and switches to Map Trace on demand', () => {
    render(<NetworkTopology initialData={topology} initialLocations={[]} />);

    expect(screen.getByText('Core Network')).toBeInTheDocument();
    expect(screen.queryByTestId('topology-map-view')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Map Trace' }));

    expect(screen.getByTestId('topology-map-view')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hierarchy' }));

    expect(screen.getByText('Core Network')).toBeInTheDocument();
  });
});
