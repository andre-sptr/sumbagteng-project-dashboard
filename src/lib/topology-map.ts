import type { TopologyHierarchy, PortEntry } from '@/lib/topology';
import type { TopologyLocation, TopologyLocationEntityType } from '@/types/database';

export interface TopologyMapNode {
  id: string;
  entityType: TopologyLocationEntityType;
  name: string;
  area: string;
  sto: string;
  latitude: number;
  longitude: number;
  confidence: TopologyLocation['confidence'];
}

export interface TopologyMapTrace {
  id: string;
  area: string;
  sto: string;
  oltName: string;
  odcName: string;
  portStr: string;
  source: PortEntry['source'];
  idIhld?: string;
  namaLop?: string;
  pathNodeIds: string[];
}

export interface MissingTopologyLocation {
  entityType: TopologyLocationEntityType;
  name: string;
  area: string;
  sto: string;
}

export interface TopologyMapContext {
  nodes: TopologyMapNode[];
  traces: TopologyMapTrace[];
  missingLocations: MissingTopologyLocation[];
}

const CORE_NAME = 'SUMBAGTENG';

function key(entityType: TopologyLocationEntityType, name: string, area: string, sto: string) {
  return `${entityType}|${name}|${area}|${sto}`;
}

function nodeId(entityType: TopologyLocationEntityType, name: string, area: string, sto: string) {
  return `${entityType}:${area}:${sto}:${name}`;
}

function getLocationMap(locations: TopologyLocation[]) {
  return new Map(
    locations
      .filter(location => location.confidence === 'verified' && hasValidCoordinates(location))
      .map(location => [
        key(location.entity_type, location.entity_name, location.area, location.sto),
        location,
      ])
  );
}

function hasValidCoordinates(location: TopologyLocation) {
  return Number.isFinite(location.latitude)
    && Number.isFinite(location.longitude)
    && location.latitude >= -90
    && location.latitude <= 90
    && location.longitude >= -180
    && location.longitude <= 180;
}

function addNode(
  nodes: Map<string, TopologyMapNode>,
  missing: Map<string, MissingTopologyLocation>,
  locationMap: Map<string, TopologyLocation>,
  entityType: TopologyLocationEntityType,
  name: string,
  area: string,
  sto: string
) {
  const exactKey = key(entityType, name, area, sto);
  const fallbackKey = key(entityType, name, '', '');
  const location = locationMap.get(exactKey) ?? locationMap.get(fallbackKey);
  const id = nodeId(entityType, name, area, sto);

  if (!location) {
    missing.set(id, { entityType, name, area, sto });
    return null;
  }

  const node: TopologyMapNode = {
    id,
    entityType,
    name,
    area,
    sto,
    latitude: location.latitude,
    longitude: location.longitude,
    confidence: location.confidence,
  };
  nodes.set(id, node);
  missing.delete(id);
  return node;
}

export function buildTopologyMapContext(
  topology: TopologyHierarchy | null,
  locations: TopologyLocation[],
  query = ''
): TopologyMapContext {
  if (!topology) {
    return { nodes: [], traces: [], missingLocations: [] };
  }

  const locationMap = getLocationMap(locations);
  const nodes = new Map<string, TopologyMapNode>();
  const missing = new Map<string, MissingTopologyLocation>();
  const traces: TopologyMapTrace[] = [];
  const normalizedQuery = query.trim().toLowerCase();

  addNode(nodes, missing, locationMap, 'core', CORE_NAME, '', '');

  for (const [area, stoMap] of Object.entries(topology)) {
    for (const [sto, oltMap] of Object.entries(stoMap)) {
      addNode(nodes, missing, locationMap, 'sto', sto, area, sto);

      for (const [oltName, olt] of Object.entries(oltMap)) {
        addNode(nodes, missing, locationMap, 'olt', oltName, area, sto);

        for (const slot of olt.slots) {
          for (const port of slot.ports) {
            if (!port) continue;
            const haystack = `${area} ${sto} ${oltName} ${port.odc_name} ${port.port_str} ${port.id_ihld ?? ''} ${port.nama_lop ?? ''}`.toLowerCase();
            if (normalizedQuery && !haystack.includes(normalizedQuery)) continue;

            const odcNode = addNode(nodes, missing, locationMap, 'odc', port.odc_name, area, sto);
            const stoNodeId = nodeId('sto', sto, area, sto);
            const oltNodeId = nodeId('olt', oltName, area, sto);
            const odcNodeId = nodeId('odc', port.odc_name, area, sto);

            if (nodes.has(stoNodeId) && nodes.has(oltNodeId) && odcNode) {
              traces.push({
                id: `${oltName}:${port.port_str}:${port.odc_name}`,
                area,
                sto,
                oltName,
                odcName: port.odc_name,
                portStr: port.port_str,
                source: port.source,
                idIhld: port.id_ihld,
                namaLop: port.nama_lop,
                pathNodeIds: [
                  nodeId('core', CORE_NAME, '', ''),
                  stoNodeId,
                  oltNodeId,
                  odcNodeId,
                ],
              });
            }
          }
        }
      }
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    traces,
    missingLocations: Array.from(missing.values()),
  };
}
