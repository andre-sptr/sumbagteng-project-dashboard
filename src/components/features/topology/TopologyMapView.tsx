'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Box, Database, MapPinned, Network, Search, Zap } from 'lucide-react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import type { TopologyHierarchy } from '@/lib/topology';
import type {
  MissingTopologyLocation,
  TopologyMapContext,
  TopologyMapNode,
  TopologyMapTrace,
} from '@/lib/topology-map';

interface TopologyMapViewProps {
  topology: TopologyHierarchy | null;
  mapContext: TopologyMapContext;
  searchQuery: string;
  selectedArea: string;
  selectedSto: string;
}

const DEFAULT_CENTER: [number, number] = [-0.9471, 100.4172];

const markerStyle: Record<TopologyMapNode['entityType'], { color: string; fillColor: string; radius: number }> = {
  core: { color: '#1d4ed8', fillColor: '#2563eb', radius: 11 },
  area: { color: '#4f46e5', fillColor: '#6366f1', radius: 9 },
  sto: { color: '#0f172a', fillColor: '#1e293b', radius: 9 },
  olt: { color: '#059669', fillColor: '#10b981', radius: 8 },
  odc: { color: '#d97706', fillColor: '#f59e0b', radius: 8 },
};

function getTraceColor(trace: TopologyMapTrace) {
  return trace.source === 'allocation' ? '#f59e0b' : '#10b981';
}

function getCenter(nodes: TopologyMapNode[]): [number, number] {
  if (nodes.length === 0) return DEFAULT_CENTER;

  const latitude = nodes.reduce((sum, node) => sum + node.latitude, 0) / nodes.length;
  const longitude = nodes.reduce((sum, node) => sum + node.longitude, 0) / nodes.length;

  return [latitude, longitude];
}

function getTracePositions(
  trace: TopologyMapTrace,
  nodesById: Map<string, TopologyMapNode>
): [number, number][] {
  return trace.pathNodeIds
    .map(id => nodesById.get(id))
    .filter((node): node is TopologyMapNode => Boolean(node))
    .map(node => [node.latitude, node.longitude]);
}

function MapViewportSync({ coordinates }: { coordinates: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (coordinates.length >= 2) {
      map.fitBounds(coordinates, { padding: [32, 32], maxZoom: 13 });
      return;
    }

    if (coordinates.length === 1) {
      map.setView(coordinates[0], 12);
      return;
    }

    map.setView(DEFAULT_CENTER, 10);
  }, [coordinates, map]);

  return null;
}

function MissingLocations({ rows }: { rows: MissingTopologyLocation[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
        <AlertTriangle size={16} />
        <h3 className="text-xs font-black uppercase tracking-widest">Missing Location Metadata</h3>
      </div>
      <p className="mt-2 text-xs font-medium text-amber-700/80 dark:text-amber-200/80">
        Markers only appear for entities with coordinates. Add coordinates to topology_locations for these entities.
      </p>
      <div className="mt-3 max-h-40 space-y-1 overflow-y-auto">
        {rows.slice(0, 12).map(row => (
          <div
            key={`${row.entityType}-${row.area}-${row.sto}-${row.name}`}
            className="flex items-center justify-between gap-3 rounded-lg bg-white/70 px-3 py-2 text-[11px] font-bold text-amber-800 dark:bg-gray-900/40 dark:text-amber-200"
          >
            <span>{row.entityType.toUpperCase()} - {row.name}</span>
            <span className="text-right text-amber-600/70 dark:text-amber-300/70">
              {row.area || 'GLOBAL'} {row.sto}
            </span>
          </div>
        ))}
      </div>
      {rows.length > 12 && (
        <p className="mt-2 text-[11px] font-bold text-amber-700/80 dark:text-amber-200/80">
          +{rows.length - 12} more entities without coordinates
        </p>
      )}
    </div>
  );
}

export default function TopologyMapView({
  topology,
  mapContext,
  searchQuery,
  selectedArea,
  selectedSto,
}: TopologyMapViewProps) {
  const [selectedTraceId, setSelectedTraceId] = useState<string>('');
  const visibleNodes = useMemo(
    () => mapContext.nodes.filter(node => (
      node.entityType === 'core' ||
      ((!selectedArea || node.area === selectedArea) && (!selectedSto || node.sto === selectedSto))
    )),
    [mapContext.nodes, selectedArea, selectedSto]
  );
  const visibleTraces = useMemo(
    () => mapContext.traces.filter(trace => (
      (!selectedArea || trace.area === selectedArea) &&
      (!selectedSto || trace.sto === selectedSto)
    )),
    [mapContext.traces, selectedArea, selectedSto]
  );
  const visibleMissingLocations = useMemo(
    () => mapContext.missingLocations.filter(row => (
      row.entityType === 'core' ||
      ((!selectedArea || row.area === selectedArea) && (!selectedSto || row.sto === selectedSto))
    )),
    [mapContext.missingLocations, selectedArea, selectedSto]
  );
  const center = useMemo(() => getCenter(visibleNodes), [visibleNodes]);
  const nodesById = useMemo(
    () => new Map(mapContext.nodes.map(node => [node.id, node])),
    [mapContext.nodes]
  );
  const selectedTrace = visibleTraces.find(trace => trace.id === selectedTraceId) ?? visibleTraces[0] ?? null;
  const selectedTracePositions = useMemo(
    () => selectedTrace ? getTracePositions(selectedTrace, nodesById) : [],
    [nodesById, selectedTrace]
  );
  const viewportCoordinates = useMemo(
    () => selectedTracePositions.length > 0
      ? selectedTracePositions
      : visibleNodes.map(node => [node.latitude, node.longitude] as [number, number]),
    [selectedTracePositions, visibleNodes]
  );

  if (!topology) {
    return (
      <div className="glass-panel min-h-[600px] rounded-3xl border border-gray-200 p-8 dark:border-gray-800">
        <p className="text-sm font-bold text-gray-500">Topology data is unavailable.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <div className="glass-panel rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <MapPinned size={16} />
            <h2 className="text-xs font-black uppercase tracking-widest">Map Trace</h2>
          </div>
          <div className="mt-4 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-500 dark:border-gray-700 dark:bg-gray-900">
            <Search size={13} className="mr-2 inline text-gray-400" />
            {searchQuery || 'Cari ODC, OLT, STO, Port...'}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
              {selectedArea || 'All Areas'}
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:bg-gray-800 dark:text-gray-300">
              {selectedSto || 'All STO'}
            </span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Trace Results</h3>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
            {visibleTraces.map(trace => (
              <button
                key={trace.id}
                type="button"
                onClick={() => setSelectedTraceId(trace.id)}
                className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                  selectedTrace?.id === trace.id
                    ? 'border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950/30 dark:text-blue-200'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black">{trace.odcName}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                    trace.source === 'allocation'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  }`}>
                    {trace.source}
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                  {trace.oltName} - {trace.portStr}
                </p>
                {trace.namaLop && (
                  <p className="mt-1 truncate text-[11px] font-medium text-gray-400 dark:text-gray-500">
                    {trace.namaLop}
                  </p>
                )}
              </button>
            ))}
            {visibleTraces.length === 0 && (
              <p className="rounded-xl border border-dashed border-gray-300 p-4 text-xs font-medium text-gray-500 dark:border-gray-700">
                No trace matches the current filters.
              </p>
            )}
          </div>
        </div>

        <MissingLocations rows={visibleMissingLocations} />
      </aside>

      <section className="glass-panel overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <Network size={18} className="text-blue-600" />
            <div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white">Geographic Trace Context</h3>
              <p className="text-xs font-medium text-gray-500">Click a trace result or map line to inspect it.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
            <span className="inline-flex items-center gap-1.5"><Database size={12} /> STO</span>
            <span className="inline-flex items-center gap-1.5"><Zap size={12} /> OLT</span>
            <span className="inline-flex items-center gap-1.5"><Box size={12} /> ODC</span>
          </div>
        </div>

        <div className="h-[620px]">
          <MapContainer center={center} zoom={10} scrollWheelZoom className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapViewportSync coordinates={viewportCoordinates} />
            {visibleTraces.map(trace => {
              const positions = getTracePositions(trace, nodesById);
              if (positions.length < 2) return null;

              return (
                <Polyline
                  key={trace.id}
                  positions={positions}
                  pathOptions={{
                    color: getTraceColor(trace),
                    weight: selectedTrace?.id === trace.id ? 6 : 4,
                    opacity: selectedTrace?.id === trace.id ? 0.95 : 0.55,
                  }}
                  eventHandlers={{ click: () => setSelectedTraceId(trace.id) }}
                />
              );
            })}
            {visibleNodes.map(node => {
              const style = markerStyle[node.entityType];

              return (
                <CircleMarker
                  key={node.id}
                  center={[node.latitude, node.longitude]}
                  radius={style.radius}
                  pathOptions={{
                    color: style.color,
                    fillColor: style.fillColor,
                    fillOpacity: 0.9,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="space-y-1">
                      <p className="text-sm font-bold">{node.name}</p>
                      <p className="text-xs">
                        {node.entityType.toUpperCase()} {node.area} {node.sto}
                      </p>
                      <p className="text-xs">Location: {node.confidence}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      </section>
    </div>
  );
}
