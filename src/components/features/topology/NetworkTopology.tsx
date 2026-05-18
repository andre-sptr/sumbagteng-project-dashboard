// Visual representation of network node hierarchy
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Network,
  ChevronRight,
  ChevronDown,
  Zap,
  Box,
  Database,
  Activity,
  Maximize2,
  Minimize2,
  Filter,
  Search,
  X,
} from 'lucide-react';
import { TopologyHierarchy, OltData, SlotData } from '@/lib/topology';

const StatusBadge = ({ status }: { status: string }) => {
  const s = status.toLowerCase();
  if (s.includes('done') || s.includes('complete') || s.includes('live')) {
    return <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />;
  }
  if (s.includes('progress') || s.includes('ongoing')) {
    return <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />;
  }
  return <span className="flex h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />;
};

function SlotPanel({
  olt,
  expandedNodes,
  toggleNode,
}: {
  olt: OltData;
  expandedNodes: Record<string, boolean>;
  toggleNode: (id: string) => void;
}) {
  const slotByIndex = new Map<number, SlotData>(olt.slots.map(s => [s.slot, s]));
  const maxPortGlobal = olt.slots.reduce((max, s) => Math.max(max, s.maxPort), 15);
  const numSlots = olt.maxSlot + 1;
  const getPortButtonClass = (portEntry: NonNullable<SlotData['ports'][number]>, isExpanded: boolean) => {
    if (isExpanded) {
      return 'bg-blue-500 ring-2 ring-blue-400 ring-offset-1 dark:ring-offset-gray-900 shadow-md';
    }
    if (portEntry.source === 'allocation') {
      return 'bg-amber-500 hover:bg-amber-400 hover:scale-110';
    }
    return 'bg-emerald-500 hover:bg-emerald-400 hover:scale-110';
  };

  return (
    <div className="mt-3 ml-4">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="font-mono text-[9px] border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60">
                <th className="sticky left-0 z-10 px-3 py-2 text-right text-[8px] text-gray-400 font-bold uppercase tracking-widest border-r border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 min-w-[2.5rem]">
                  P\S
                </th>
                {Array.from({ length: numSlots }, (_, s) => (
                  <th
                    key={s}
                    className="py-2 text-center text-gray-500 dark:text-gray-400 font-bold border-b border-gray-200 dark:border-gray-700 min-w-[1.5rem] w-6"
                  >
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxPortGlobal + 1 }, (_, portIdx) => {
                const expandedInRow = Array.from({ length: numSlots }, (_, slotIdx) => {
                  const p = slotByIndex.get(slotIdx)?.ports[portIdx] ?? null;
                  return p && expandedNodes[`PORT-${p.port_str}`] ? p : null;
                }).filter((p): p is NonNullable<typeof p> => p !== null);

                return (
                  <React.Fragment key={portIdx}>
                    <tr className={`border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors ${portIdx % 2 === 1 ? 'bg-gray-50/60 dark:bg-gray-800/20' : ''}`}>
                      <td className="sticky left-0 z-10 px-3 py-1 text-right text-gray-500 dark:text-gray-400 font-bold border-r border-gray-200 dark:border-gray-700 bg-inherit">
                        {String(portIdx).padStart(2, '0')}
                      </td>
                      {Array.from({ length: numSlots }, (_, slotIdx) => {
                        const portEntry = slotByIndex.get(slotIdx)?.ports[portIdx] ?? null;
                        const isExpanded = portEntry ? expandedNodes[`PORT-${portEntry.port_str}`] : false;
                        return (
                          <td key={slotIdx} className="p-0.5 text-center">
                            <button
                              className={`w-5 h-5 rounded-sm block mx-auto transition-all
                                ${portEntry
                                  ? getPortButtonClass(portEntry, isExpanded)
                                  : 'bg-gray-100 dark:bg-gray-700/50 cursor-default'
                                }`}
                              title={portEntry
                                ? `${portEntry.port_str} -> ${portEntry.odc_name}${portEntry.source === 'allocation' ? ` (${portEntry.nama_lop || 'AANWIJZING'})` : ''}`
                                : `S${slotIdx} P${portIdx}: empty`}
                              onClick={() => portEntry && toggleNode(`PORT-${portEntry.port_str}`)}
                              disabled={!portEntry}
                            />
                          </td>
                        );
                      })}
                    </tr>
                    {expandedInRow.length > 0 && (
                      <tr className="bg-blue-50 dark:bg-blue-900/20">
                        <td colSpan={numSlots + 1} className="px-3 py-1.5">
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                            {expandedInRow.map(p => (
                              <div key={p.port_str} className="flex items-center gap-1.5 text-[9px]">
                                <span className="font-bold text-blue-600 dark:text-blue-400">{p.port_str}</span>
                                <span className="text-blue-300 dark:text-blue-700">-&gt;</span>
                                <Box size={9} className="text-blue-400 shrink-0" />
                                <span className="font-medium text-gray-700 dark:text-gray-200">{p.odc_name}</span>
                                {p.source === 'allocation' && (
                                  <span className="text-amber-600 dark:text-amber-400">AANWIJZING {p.id_ihld}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function NetworkTopology({ initialData }: { initialData: TopologyHierarchy | null }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ ROOT: true });
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [selectedSto, setSelectedSto] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredData = useMemo<TopologyHierarchy | null>(() => {
    if (!data) return null;
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    const result: TopologyHierarchy = {};
    for (const [area, stoMap] of Object.entries(data)) {
      if (area.toLowerCase().includes(q)) { result[area] = stoMap; continue; }
      const matchedStos: TopologyHierarchy[string] = {};
      for (const [sto, oltMap] of Object.entries(stoMap)) {
        if (sto.toLowerCase().includes(q)) { matchedStos[sto] = oltMap; continue; }
        const matchedOlts: typeof oltMap = {};
        for (const [oltName, olt] of Object.entries(oltMap)) {
          const hits = oltName.toLowerCase().includes(q) ||
            olt.slots.some(s => s.ports.some(p => p && (
              p.odc_name.toLowerCase().includes(q) || p.port_str.toLowerCase().includes(q)
            )));
          if (hits) matchedOlts[oltName] = olt;
        }
        if (Object.keys(matchedOlts).length > 0) matchedStos[sto] = matchedOlts;
      }
      if (Object.keys(matchedStos).length > 0) result[area] = matchedStos;
    }
    return result;
  }, [data, searchQuery]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (!value.trim() || !data) return;
    const toExpand: Record<string, boolean> = { ROOT: true };
    for (const [area, stoMap] of Object.entries(data)) {
      toExpand[`AREA-${area}`] = true;
      for (const sto of Object.keys(stoMap)) toExpand[`STO-${sto}`] = true;
    }
    setExpandedNodes(prev => ({ ...prev, ...toExpand }));
  };

  useEffect(() => {
    if (!initialData) {
      fetch('/api/topology')
        .then(res => res.json())
        .then(response => {
          if (response.success) setData(response.data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching topology:', err);
          setLoading(false);
        });
    }
  }, [initialData]);

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const areas = Object.keys(data || {});

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin" />
          <Network className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600" size={24} />
        </div>
        <p className="text-sm font-bold text-gray-500 animate-pulse uppercase tracking-widest">Generating Topology Map...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 rounded-xl text-white">
            <Network size={18} />
            <span className="text-xs font-black uppercase tracking-wider">Network Topology</span>
          </div>

          <div className="h-8 w-px bg-gray-200 dark:bg-gray-800 hidden md:block" />

          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Cari OLT, ODC, STO, Port..."
              className="bg-transparent border-none text-xs focus:ring-0 outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400 w-44"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <X size={12} />
              </button>
            )}
          </div>

          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 hidden md:block" />

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={selectedArea}
              onChange={(e) => { setSelectedArea(e.target.value); setSelectedSto(''); }}
              className="bg-transparent border-none text-xs font-bold focus:ring-0 cursor-pointer"
            >
              <option value="">ALL AREAS</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {selectedArea && (
            <div className="flex items-center gap-2">
              <select
                value={selectedSto}
                onChange={(e) => setSelectedSto(e.target.value)}
                className="bg-transparent border-none text-xs font-bold focus:ring-0 cursor-pointer"
              >
                <option value="">ALL STOs</option>
                {Object.keys((data?.[selectedArea] || {})).map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setExpandedNodes({ ROOT: true })}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
            title="Collapse All"
          >
            <Minimize2 size={18} />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
            title="Fullscreen"
          >
            <Maximize2 size={18} />
          </button>
        </div>
      </div>

      <div className="glass-panel p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden min-h-[600px] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.05),transparent)]">
        <div className="relative max-w-4xl mx-auto">
          <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative px-6 py-4 bg-white dark:bg-gray-900 ring-1 ring-gray-900/5 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg">
                  <Activity size={24} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Core Network</h4>
                  <p className="text-xl font-black text-gray-900 dark:text-white">SUMBAGTENG</p>
                </div>
              </div>
            </div>

            <div className="mt-12 w-full space-y-12">
              {searchQuery && Object.keys(filteredData || {}).length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                  <Search size={32} className="opacity-30" />
                  <p className="text-sm font-medium">Tidak ada hasil untuk <span className="font-bold text-gray-600 dark:text-gray-300">&quot;{searchQuery}&quot;</span></p>
                  <button onClick={() => setSearchQuery('')} className="text-xs text-blue-500 hover:underline">Hapus pencarian</button>
                </div>
              )}
              {Object.keys(filteredData || {})
                .filter(a => !selectedArea || a === selectedArea)
                .map((area) => (
                  <div key={area} className="relative pl-8">
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/50 to-transparent" />

                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-4 h-px bg-blue-500/50" />
                      <div
                        className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => toggleNode(`AREA-${area}`)}
                      >
                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
                          <Box size={14} /> AREA: {area}
                          {expandedNodes[`AREA-${area}`] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                      </div>
                    </div>

                    {expandedNodes[`AREA-${area}`] && Object.keys(filteredData?.[area] || {})
                      .filter(b => !selectedSto || b === selectedSto)
                      .map((sto) => (
                        <div key={sto} className="ml-8 mb-8 relative">
                          <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-800" />

                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-4 h-px bg-gray-200 dark:bg-gray-800" />
                            <div
                              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                              onClick={() => toggleNode(`STO-${sto}`)}
                            >
                              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <Database size={12} /> STO: {sto}
                                {expandedNodes[`STO-${sto}`] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                              </span>
                            </div>
                          </div>

                          {expandedNodes[`STO-${sto}`] && (Object.values(filteredData?.[area]?.[sto] || {}) as OltData[]).map((olt) => (
                            <div key={olt.name} className="ml-8 mt-6">
                              <div className="flex items-center gap-4">
                                <div
                                  className="relative group cursor-pointer"
                                  onClick={() => toggleNode(`OLT-${olt.name}`)}
                                >
                                  <div className="absolute -inset-0.5 bg-emerald-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                                  <div className="relative flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-2 border-emerald-500/30 rounded-xl shadow-sm">
                                    <div className="p-2 bg-emerald-500 rounded-lg text-white">
                                      <Zap size={16} />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">OLT (GPON)</span>
                                        <StatusBadge status={olt.status} />
                                      </div>
                                      <p className="text-xs font-bold text-gray-900 dark:text-white">{olt.name}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-400 ml-3">
                                      <span className="text-[9px] font-mono">{olt.realizedPorts}/{olt.plannedPorts}p</span>
                                      {expandedNodes[`OLT-${olt.name}`]
                                        ? <ChevronDown size={12} />
                                        : <ChevronRight size={12} />}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/50 to-transparent" />
                              </div>

                              {expandedNodes[`OLT-${olt.name}`] && (
                                <SlotPanel
                                  olt={olt}
                                  expandedNodes={expandedNodes}
                                  toggleNode={toggleNode}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-8 py-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Master Port</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">AANWIJZING Allocation</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Selected (ODC Shown)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Empty Port</span>
        </div>
      </div>
    </div>
  );
}
