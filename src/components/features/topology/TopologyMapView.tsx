'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Box, Database, MapPinned, Minimize2, Network, Search, Zap } from 'lucide-react';
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
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

const DEFAULT_CENTER: [number, number] = [-0.9471, 100.4172];
type TraceSourceFilter = 'all' | TopologyMapTrace['source'];
type TraceGroupMode = 'sto' | 'olt' | 'odc';
type MissingLocationFilter = 'all' | 'sto' | 'olt' | 'odc';

const TRACE_SOURCE_OPTIONS: Array<{
  value: TraceSourceFilter;
  label: string;
  ariaLabel: string;
}> = [
  { value: 'all', label: 'All', ariaLabel: 'All traces' },
  { value: 'master', label: 'Master', ariaLabel: 'Master traces' },
  { value: 'allocation', label: 'Allocation', ariaLabel: 'Allocation traces' },
];

const TRACE_GROUP_OPTIONS: Array<{
  value: TraceGroupMode;
  label: string;
  ariaLabel: string;
}> = [
  { value: 'sto', label: 'STO', ariaLabel: 'Group by STO' },
  { value: 'olt', label: 'OLT', ariaLabel: 'Group by OLT' },
  { value: 'odc', label: 'ODC', ariaLabel: 'Group by ODC' },
];

const MISSING_FILTER_OPTIONS: Array<{
  value: MissingLocationFilter;
  label: string;
  ariaLabel: string;
}> = [
  { value: 'all', label: 'All', ariaLabel: 'All missing locations' },
  { value: 'sto', label: 'STO', ariaLabel: 'STO missing locations' },
  { value: 'olt', label: 'OLT', ariaLabel: 'OLT missing locations' },
  { value: 'odc', label: 'ODC', ariaLabel: 'ODC missing locations' },
];

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

function getTraceGroupKey(trace: TopologyMapTrace, groupMode: TraceGroupMode) {
  if (groupMode === 'sto') return trace.sto || 'Unknown STO';
  if (groupMode === 'odc') return trace.odcName || 'Unknown ODC';
  return trace.oltName || 'Unknown OLT';
}

function getGroupedTraces(traces: TopologyMapTrace[], groupMode: TraceGroupMode) {
  const groups = new Map<string, TopologyMapTrace[]>();
  for (const trace of traces) {
    const key = getTraceGroupKey(trace, groupMode);
    groups.set(key, [...(groups.get(key) ?? []), trace]);
  }
  return Array.from(groups.entries()).map(([key, rows]) => ({ key, rows }));
}

function getSourceBadgeClass(source: TopologyMapTrace['source']) {
  return source === 'allocation'
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
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
      map.setView(coordinates[0], 13);
      return;
    }

    map.setView(DEFAULT_CENTER, 10);
  }, [coordinates, map]);

  return null;
}

function MissingLocations({ rows }: { rows: MissingTopologyLocation[] }) {
  const [expanded, setExpanded] = useState(false);
  const [entityFilter, setEntityFilter] = useState<MissingLocationFilter>('all');

  if (rows.length === 0) return null;
  const counts = rows.reduce(
    (result, row) => {
      result.all += 1;
      if (row.entityType === 'sto' || row.entityType === 'olt' || row.entityType === 'odc') {
        result[row.entityType] += 1;
      }
      return result;
    },
    { all: 0, sto: 0, olt: 0, odc: 0 } as Record<MissingLocationFilter, number>
  );
  const filteredRows = entityFilter === 'all'
    ? rows
    : rows.filter(row => row.entityType === entityFilter);
  const countLabel = `${filteredRows.length} lokasi belum verified`;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <AlertTriangle size={16} />
            <h3 className="text-xs font-black uppercase tracking-widest">Missing Locations</h3>
          </div>
          <p className="mt-2 text-sm font-black text-amber-900 dark:text-amber-100">
            {countLabel}
          </p>
          <p className="mt-1 text-xs font-medium text-amber-700/80 dark:text-amber-200/80">
            Marker hanya muncul untuk entity dengan koordinat verified.
          </p>
        </div>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(value => !value)}
          className="shrink-0 rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-gray-900/50 dark:text-amber-200"
        >
          {expanded ? 'Tutup' : 'Detail'}
        </button>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1.5" aria-label="Missing location filter">
        {MISSING_FILTER_OPTIONS.map(option => {
          const isActive = entityFilter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-label={option.ariaLabel}
              aria-pressed={isActive}
              onClick={() => setEntityFilter(option.value)}
              className={`rounded-lg border px-1.5 py-1 text-[9px] font-black uppercase tracking-wider transition-colors ${
                isActive
                  ? 'border-amber-400 bg-white text-amber-800 dark:bg-amber-950/40 dark:text-amber-100'
                  : 'border-amber-200/70 bg-amber-100/40 text-amber-700/70 hover:bg-white dark:border-amber-800/70 dark:bg-amber-950/20 dark:text-amber-200/70'
              }`}
            >
              <span className="block">{option.label}</span>
              <span className="block font-mono text-[8px] opacity-70">{counts[option.value]}</span>
            </button>
          );
        })}
      </div>

      {expanded && (
        <>
          <div className="mt-3 max-h-40 space-y-1 overflow-y-auto">
            {filteredRows.slice(0, 12).map(row => (
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
          {filteredRows.length > 12 && (
            <p className="mt-2 text-[11px] font-bold text-amber-700/80 dark:text-amber-200/80">
              +{filteredRows.length - 12} entity lain tanpa koordinat verified
            </p>
          )}
        </>
      )}
    </div>
  );
}

function SelectedTraceInspector({
  trace,
  nodesById,
  focusedNodeId,
  onFocusNode,
}: {
  trace: TopologyMapTrace | null;
  nodesById: Map<string, TopologyMapNode>;
  focusedNodeId: string;
  onFocusNode: (nodeId: string) => void;
}) {
  if (!trace) {
    return (
      <div className="glass-panel rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Selected Trace</h3>
        <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
          Belum ada trace yang bisa ditampilkan.
        </p>
      </div>
    );
  }

  const routeNodes = trace.pathNodeIds
    .map(id => nodesById.get(id))
    .filter((node): node is TopologyMapNode => Boolean(node));
  const missingNodeCount = Math.max(trace.pathNodeIds.length - routeNodes.length, 0);

  return (
    <div className="glass-panel rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Selected Trace</h3>
          <p className="mt-1 truncate text-sm font-black text-gray-900 dark:text-white">{trace.odcName}</p>
          <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
            {trace.oltName} / {trace.portStr}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${getSourceBadgeClass(trace.source)}`}>
          {trace.source}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/50">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Area / STO</p>
          <p className="mt-0.5 truncate text-xs font-bold text-gray-700 dark:text-gray-200">
            {trace.area} / {trace.sto}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/50">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">IHLD</p>
          <p className="mt-0.5 truncate text-xs font-bold text-gray-700 dark:text-gray-200">
            {trace.idIhld || '-'}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {routeNodes.map((node, index) => (
          <button
            key={node.id}
            type="button"
            onClick={() => onFocusNode(node.id)}
            aria-label={`Focus ${node.entityType.toUpperCase()} ${node.name}`}
            className={`flex w-full items-center gap-2 rounded-lg p-1.5 text-left text-xs transition-colors ${
              focusedNodeId === node.id
                ? 'bg-blue-50 ring-1 ring-blue-200 dark:bg-blue-950/30 dark:ring-blue-900'
                : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
            }`}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-black text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-gray-800 dark:text-gray-100">{node.name}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {node.entityType} {node.area || 'GLOBAL'} {node.sto}
              </p>
              <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                {node.confidence} / {node.latitude.toFixed(4)}, {node.longitude.toFixed(4)}
              </p>
            </div>
          </button>
        ))}
      </div>

      {missingNodeCount > 0 && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
          {missingNodeCount} node route belum punya koordinat verified.
        </p>
      )}

      {trace.namaLop && (
        <p className="mt-3 truncate rounded-lg bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 dark:bg-gray-900/50 dark:text-gray-400">
          {trace.namaLop}
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
  isExpanded = false,
  onToggleExpanded,
}: TopologyMapViewProps) {
  const [selectedTraceId, setSelectedTraceId] = useState<string>('');
  const [showAllTraces, setShowAllTraces] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<TraceSourceFilter>('all');
  const [focusedNodeId, setFocusedNodeId] = useState<string>('');
  const [groupMode, setGroupMode] = useState<TraceGroupMode>('olt');
  const [compareMode, setCompareMode] = useState(false);
  const [comparedTraceIds, setComparedTraceIds] = useState<string[]>([]);
  const [isTracePanelCollapsed, setIsTracePanelCollapsed] = useState(false);
  const [tracePanelWidth, setTracePanelWidth] = useState(320);
  const visibleNodes = useMemo(
    () => mapContext.nodes.filter(node => (
      node.entityType === 'core' ||
      ((!selectedArea || node.area === selectedArea) && (!selectedSto || node.sto === selectedSto))
    )),
    [mapContext.nodes, selectedArea, selectedSto]
  );
  const areaStoTraces = useMemo(
    () => mapContext.traces.filter(trace => (
      (!selectedArea || trace.area === selectedArea) &&
      (!selectedSto || trace.sto === selectedSto)
    )),
    [mapContext.traces, selectedArea, selectedSto]
  );
  const sourceCounts = useMemo(() => {
    return areaStoTraces.reduce(
      (counts, trace) => {
        counts.all += 1;
        counts[trace.source] += 1;
        return counts;
      },
      { all: 0, master: 0, allocation: 0 } as Record<TraceSourceFilter, number>
    );
  }, [areaStoTraces]);
  const visibleTraces = useMemo(
    () => sourceFilter === 'all'
      ? areaStoTraces
      : areaStoTraces.filter(trace => trace.source === sourceFilter),
    [areaStoTraces, sourceFilter]
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
  const focusedNode = focusedNodeId ? nodesById.get(focusedNodeId) ?? null : null;
  const comparedTraces = useMemo(
    () => visibleTraces.filter(trace => comparedTraceIds.includes(trace.id)),
    [comparedTraceIds, visibleTraces]
  );
  const renderedTraces = useMemo(
    () => {
      if (compareMode && comparedTraces.length > 0) return comparedTraces;
      return showAllTraces ? visibleTraces : selectedTrace ? [selectedTrace] : [];
    },
    [compareMode, comparedTraces, selectedTrace, showAllTraces, visibleTraces]
  );
  const displayedTraces = useMemo(
    () => showAllTraces ? visibleTraces : visibleTraces.slice(0, 8),
    [showAllTraces, visibleTraces]
  );
  const groupedDisplayedTraces = useMemo(
    () => getGroupedTraces(displayedTraces, groupMode),
    [displayedTraces, groupMode]
  );
  const hiddenTraceCount = Math.max(visibleTraces.length - displayedTraces.length, 0);
  const selectedTracePositions = useMemo(
    () => selectedTrace ? getTracePositions(selectedTrace, nodesById) : [],
    [nodesById, selectedTrace]
  );
  const viewportCoordinates = useMemo(
    () => focusedNode
      ? [[focusedNode.latitude, focusedNode.longitude] as [number, number]]
      : selectedTracePositions.length > 0
      ? selectedTracePositions
      : visibleNodes.map(node => [node.latitude, node.longitude] as [number, number]),
    [focusedNode, selectedTracePositions, visibleNodes]
  );

  const handleSourceFilterChange = (nextSourceFilter: TraceSourceFilter) => {
    setSourceFilter(nextSourceFilter);
    setSelectedTraceId('');
    setFocusedNodeId('');
    setShowAllTraces(false);
    setComparedTraceIds([]);
  };

  const handleTraceSelect = (traceId: string) => {
    setSelectedTraceId(traceId);
    setFocusedNodeId('');
  };

  const handleCompareToggle = () => {
    setCompareMode(value => {
      if (value) setComparedTraceIds([]);
      return !value;
    });
    setShowAllTraces(false);
    setFocusedNodeId('');
  };

  const toggleComparedTrace = (traceId: string) => {
    setComparedTraceIds(current => {
      if (current.includes(traceId)) return current.filter(id => id !== traceId);
      if (current.length >= 5) return current;
      return [...current, traceId];
    });
  };

  const adjustTracePanelWidth = (delta: number) => {
    setTracePanelWidth(current => Math.min(440, Math.max(280, current + delta)));
  };

  if (!topology) {
    return (
      <div className="glass-panel min-h-[600px] rounded-3xl border border-gray-200 p-8 dark:border-gray-800">
        <p className="text-sm font-bold text-gray-500">Topology data is unavailable.</p>
      </div>
    );
  }

  return (
    <div
      className={`grid gap-5 ${
      isExpanded
        ? 'fixed inset-3 z-50 overflow-auto rounded-3xl bg-slate-50/95 p-3 shadow-2xl backdrop-blur dark:bg-slate-950/95 lg:grid-cols-[360px_minmax(0,1fr)]'
        : isTracePanelCollapsed
          ? 'lg:grid-cols-1'
          : 'lg:grid-cols-[auto_minmax(0,1fr)]'
    }`}
    >
      {!isTracePanelCollapsed && (
      <aside
        className={`${isExpanded ? 'hidden lg:block' : 'order-2'} space-y-4 lg:order-1 lg:sticky lg:top-24 lg:self-start`}
        style={{ width: tracePanelWidth }}
      >
        <div className="glass-panel rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <MapPinned size={16} />
              <h2 className="text-xs font-black uppercase tracking-widest">Map Trace</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Narrow trace panel"
                onClick={() => adjustTracePanelWidth(-40)}
                className="hidden rounded-md px-2 py-1 text-[10px] font-black text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 lg:inline-flex"
              >
                -
              </button>
              <button
                type="button"
                aria-label="Widen trace panel"
                onClick={() => adjustTracePanelWidth(40)}
                className="hidden rounded-md px-2 py-1 text-[10px] font-black text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 lg:inline-flex"
              >
                +
              </button>
              <button
                type="button"
                aria-label="Collapse trace panel"
                onClick={() => setIsTracePanelCollapsed(true)}
                className="rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wider text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              >
                Hide
              </button>
            </div>
          </div>
          <div
            aria-live="polite"
            className="mt-4 rounded-xl bg-gray-50 p-3 dark:bg-gray-900/50"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                <Search size={14} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  Filter dari Search Utama
                </p>
                <p className={`mt-1 truncate text-xs font-bold ${
                  searchQuery
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {searchQuery ? `"${searchQuery}"` : 'Belum ada filter pencarian'}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
              {selectedArea || 'All Areas'}
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:bg-gray-800 dark:text-gray-300">
              {selectedSto || 'All STO'}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2" aria-label="Trace source filter">
            {TRACE_SOURCE_OPTIONS.map(option => {
              const isActive = sourceFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-label={option.ariaLabel}
                  aria-pressed={isActive}
                  onClick={() => handleSourceFilterChange(option.value)}
                  className={`rounded-lg border px-2 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
                  }`}
                >
                  <span className="block">{option.label}</span>
                  <span className="mt-0.5 block font-mono text-[9px] opacity-70">{sourceCounts[option.value]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <SelectedTraceInspector
          trace={selectedTrace}
          nodesById={nodesById}
          focusedNodeId={focusedNodeId}
          onFocusNode={setFocusedNodeId}
        />

        <div className="glass-panel rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Trace Results</h3>
              <p className="mt-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                {visibleTraces.length} route tersedia
              </p>
              {compareMode && (
                <p className="mt-1 text-[11px] font-black text-blue-600 dark:text-blue-300">
                  {comparedTraceIds.length} dibandingkan
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {visibleTraces.length > 1 && (
                <button
                  type="button"
                  onClick={handleCompareToggle}
                  className={`rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-colors ${
                    compareMode
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
                  }`}
                  aria-label={compareMode ? 'Exit compare traces' : 'Compare traces'}
                >
                  {compareMode ? 'Done' : 'Compare'}
                </button>
              )}
              {visibleTraces.length > 1 && (
              <button
                type="button"
                onClick={() => setShowAllTraces(value => !value)}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-gray-500 transition-colors hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                aria-label={showAllTraces ? 'Focus selected trace' : 'Show all traces'}
              >
                {showAllTraces ? 'Focus' : 'Show all'}
              </button>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Grouped by {groupMode.toUpperCase()}
            </p>
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900/60">
              {TRACE_GROUP_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  aria-label={option.ariaLabel}
                  aria-pressed={groupMode === option.value}
                  onClick={() => setGroupMode(option.value)}
                  className={`rounded-md px-2 py-1 text-[9px] font-black uppercase tracking-wider transition-colors ${
                    groupMode === option.value
                      ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-300'
                      : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
            {groupedDisplayedTraces.map(group => (
              <div key={group.key} className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 dark:bg-gray-900/50">
                  <span className="truncate text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {group.key}
                  </span>
                  <span className="text-[10px] font-black text-gray-400">{group.rows.length}</span>
                </div>
                {group.rows.map(trace => {
                  const isCompared = comparedTraceIds.includes(trace.id);
                  const compareDisabled = compareMode && !isCompared && comparedTraceIds.length >= 5;

                  if (compareMode) {
                    return (
                      <label
                        key={trace.id}
                        className={`block rounded-xl border px-3 py-2 text-left transition-colors ${
                          isCompared
                            ? 'border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950/30 dark:text-blue-200'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
                        } ${compareDisabled ? 'opacity-50' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={isCompared}
                            disabled={compareDisabled}
                            onChange={() => toggleComparedTrace(trace.id)}
                            aria-label={`Compare ${trace.odcName} ${trace.portStr}`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-black">{trace.odcName}</span>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${getSourceBadgeClass(trace.source)}`}>
                                {trace.source}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                              <span className="truncate">{trace.oltName}</span>
                              <span className="shrink-0 font-mono">{trace.portStr}</span>
                            </div>
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                              {trace.area} / {trace.sto}
                            </p>
                          </div>
                        </div>
                      </label>
                    );
                  }

                  return (
                    <button
                      key={trace.id}
                      type="button"
                      onClick={() => handleTraceSelect(trace.id)}
                      className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                        selectedTrace?.id === trace.id
                          ? 'border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950/30 dark:text-blue-200'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-black">{trace.odcName}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${getSourceBadgeClass(trace.source)}`}>
                          {trace.source}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                        <span className="truncate">{trace.oltName}</span>
                        <span className="shrink-0 font-mono">{trace.portStr}</span>
                      </div>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        {trace.area} / {trace.sto}
                      </p>
                      {trace.namaLop && (
                        <p className="mt-1 truncate text-[11px] font-medium text-gray-400 dark:text-gray-500">
                          {trace.namaLop}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
            {!showAllTraces && hiddenTraceCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllTraces(true)}
                className="w-full rounded-xl border border-dashed border-gray-300 px-3 py-2 text-xs font-bold text-gray-500 transition-colors hover:border-blue-300 hover:text-blue-600 dark:border-gray-700"
              >
                Tampilkan {hiddenTraceCount} route lain
              </button>
            )}
            {visibleTraces.length === 0 && (
              <p className="rounded-xl border border-dashed border-gray-300 p-4 text-xs font-medium text-gray-500 dark:border-gray-700">
                No trace matches the current filters.
              </p>
            )}
          </div>
        </div>

        <MissingLocations rows={visibleMissingLocations} />
      </aside>
      )}

      <section className="glass-panel order-1 overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-800 lg:order-2">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            {isTracePanelCollapsed && (
              <button
                type="button"
                aria-label="Expand trace panel"
                onClick={() => setIsTracePanelCollapsed(false)}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-blue-600 transition-colors hover:border-blue-300 dark:border-gray-700 dark:bg-gray-900 dark:text-blue-300"
              >
                Panel
              </button>
            )}
            <Network size={18} className="text-blue-600" />
            <div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white">Geographic Trace Context</h3>
              <p className="text-xs font-medium text-gray-500">
                {compareMode && comparedTraces.length > 0
                  ? `${comparedTraces.length} route dibandingkan.`
                  : showAllTraces
                    ? 'Semua route ditampilkan. Pilih satu route untuk fokus.'
                    : 'Fokus pada selected trace. Aktifkan show all untuk overlay semua route.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-500">
              <span className="inline-flex items-center gap-1.5"><span className="h-1 w-5 rounded-full bg-blue-600" /> Selected</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-1 w-5 rounded-full bg-emerald-500" /> Master</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-1 w-5 rounded-full bg-amber-500" /> Allocation</span>
              <span className="inline-flex items-center gap-1.5"><Database size={12} /> STO</span>
              <span className="inline-flex items-center gap-1.5"><Zap size={12} /> OLT</span>
              <span className="inline-flex items-center gap-1.5"><Box size={12} /> ODC</span>
            </div>
            {isExpanded && onToggleExpanded && (
              <button
                type="button"
                onClick={onToggleExpanded}
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Exit Fullscreen Map"
                aria-label="Exit Fullscreen Map"
              >
                <Minimize2 size={18} />
              </button>
            )}
          </div>
        </div>

        <div className={`${isExpanded ? 'h-[calc(100vh-9rem)] min-h-[520px]' : 'h-[520px] sm:h-[600px] lg:h-[620px]'}`}>
          <MapContainer center={center} zoom={10} scrollWheelZoom className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapViewportSync coordinates={viewportCoordinates} />
            {renderedTraces.map(trace => {
              const positions = getTracePositions(trace, nodesById);
              if (positions.length < 2) return null;

              return (
                <Polyline
                  key={trace.id}
                  positions={positions}
                  pathOptions={{
                    color: selectedTrace?.id === trace.id ? '#2563eb' : getTraceColor(trace),
                    weight: selectedTrace?.id === trace.id ? 7 : 3,
                    opacity: selectedTrace?.id === trace.id ? 0.95 : 0.32,
                  }}
                  eventHandlers={{ click: () => setSelectedTraceId(trace.id) }}
                />
              );
            })}
            {visibleNodes.map(node => {
              const style = markerStyle[node.entityType];
              const isFocusedNode = focusedNodeId === node.id;

              return (
                <CircleMarker
                  key={node.id}
                  center={[node.latitude, node.longitude]}
                  radius={isFocusedNode ? style.radius + 4 : style.radius}
                  pathOptions={{
                    color: style.color,
                    fillColor: style.fillColor,
                    fillOpacity: 0.9,
                    weight: isFocusedNode ? 4 : 2,
                  }}
                >
                  <Popup>
                    <div className="space-y-1">
                      <p className="text-sm font-bold">{node.name}</p>
                      <p className="text-xs">
                        {node.entityType.toUpperCase()} {node.area} {node.sto}
                      </p>
                      <p className="text-xs">Location: {node.confidence}</p>
                      <p className="text-xs">
                        {node.latitude.toFixed(5)}, {node.longitude.toFixed(5)}
                      </p>
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
