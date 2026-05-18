import { OltOdcRepository } from '@/repositories/OltOdcRepository';
import { TopologyAllocationRepository } from '@/repositories/TopologyAllocationRepository';

export interface PortEntry {
  port: number;
  odc_name: string;
  port_str: string;
  source: 'master' | 'allocation';
  nama_lop?: string;
  id_ihld?: string;
  aanwijzing_id?: string;
}

export interface SlotData {
  slot: number;
  frame: string;
  maxPort: number;
  ports: (PortEntry | null)[];
}

export interface OltData {
  name: string;
  type: 'OLT';
  status: string;
  plannedPorts: number;
  realizedPorts: number;
  slots: SlotData[];
  maxSlot: number;
}

export type StoData = Record<string, OltData>;
export type AreaData = Record<string, StoData>;
export type TopologyHierarchy = Record<string, AreaData>;

export function getNetworkHierarchy(): TopologyHierarchy {
  const rows = OltOdcRepository.findAll();
  const allocations = TopologyAllocationRepository.findAll();
  const hierarchy: TopologyHierarchy = {};

  type SlotInfo = { frame: string; maxPort: number; portEntries: Map<number, PortEntry> };
  const slotMaps: Record<string, Record<string, Record<string, Map<number, SlotInfo>>>> = {};

  const addPort = (row: {
    area: string;
    sto: string;
    olt_name: string;
    odc_name: string;
    port_str: string;
    frame: string;
    slot: number;
    port: number;
    source: 'master' | 'allocation';
    nama_lop?: string;
    id_ihld?: string;
    aanwijzing_id?: string;
  }) => {
    if (!row.area || !row.sto || !row.olt_name) return;

    if (!hierarchy[row.area]) hierarchy[row.area] = {};
    if (!hierarchy[row.area][row.sto]) hierarchy[row.area][row.sto] = {};
    if (!hierarchy[row.area][row.sto][row.olt_name]) {
      hierarchy[row.area][row.sto][row.olt_name] = {
        name: row.olt_name,
        type: 'OLT',
        status: 'LIVE',
        plannedPorts: 0,
        realizedPorts: 0,
        slots: [],
        maxSlot: 0,
      };
    }

    if (!slotMaps[row.area]) slotMaps[row.area] = {};
    if (!slotMaps[row.area][row.sto]) slotMaps[row.area][row.sto] = {};
    if (!slotMaps[row.area][row.sto][row.olt_name]) slotMaps[row.area][row.sto][row.olt_name] = new Map();

    const slotMap = slotMaps[row.area][row.sto][row.olt_name];
    if (!slotMap.has(row.slot)) {
      slotMap.set(row.slot, { frame: row.frame, maxPort: 0, portEntries: new Map() });
    }
    const slotInfo = slotMap.get(row.slot)!;
    if (row.port > slotInfo.maxPort) slotInfo.maxPort = row.port;
    slotInfo.portEntries.set(row.port, {
      port: row.port,
      odc_name: row.odc_name,
      port_str: row.port_str,
      source: row.source,
      nama_lop: row.nama_lop,
      id_ihld: row.id_ihld,
      aanwijzing_id: row.aanwijzing_id,
    });
  };

  for (const row of rows) {
    addPort({ ...row, source: 'master' });
  }

  for (const row of allocations) {
    addPort({
      area: row.area,
      sto: row.sto,
      olt_name: row.olt_name,
      odc_name: row.odc_name,
      port_str: row.port_str,
      frame: String(row.frame),
      slot: row.slot,
      port: row.port,
      source: 'allocation',
      nama_lop: row.nama_lop,
      id_ihld: row.id_ihld,
      aanwijzing_id: row.aanwijzing_id,
    });
  }

  for (const area of Object.keys(hierarchy)) {
    for (const sto of Object.keys(hierarchy[area])) {
      for (const oltName of Object.keys(hierarchy[area][sto])) {
        const slotMap = slotMaps[area]?.[sto]?.[oltName];
        if (!slotMap) continue;

        const olt = hierarchy[area][sto][oltName];
        const slotIndices = Array.from(slotMap.keys()).sort((a, b) => a - b);
        const maxSlotFromData = slotIndices.length > 0 ? slotIndices[slotIndices.length - 1] : 0;
        olt.maxSlot = Math.max(maxSlotFromData, 17);

        olt.slots = slotIndices.map(slotNum => {
          const info = slotMap.get(slotNum)!;
          const maxPort = Math.max(info.maxPort, 15);
          const ports: (PortEntry | null)[] = new Array(maxPort + 1).fill(null);
          for (const [portNum, entry] of info.portEntries) {
            ports[portNum] = entry;
          }
          return { slot: slotNum, frame: info.frame, maxPort, ports };
        });

        olt.realizedPorts = olt.slots.reduce((sum, s) => sum + s.ports.filter(Boolean).length, 0);
        olt.plannedPorts = olt.slots.reduce((sum, s) => sum + s.ports.length, 0);
      }
    }
  }

  return hierarchy;
}
