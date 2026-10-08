import React, { useState, useMemo } from 'react';
import { Sankey, Tooltip, ResponsiveContainer } from 'recharts';
import { generateSankeyFlowData } from '../utils/cfaValidationUtils.js';

// Color map for Sankey Nodes
const getNodeColor = (name) => {
  if (name.includes('MATCH (ALIGNED)')) return '#10B981'; // Emerald Green
  if (name.includes('MIS-MATCH')) return '#EF4444'; // Red
  if (name.startsWith('T1QM')) return '#6366F1'; // Indigo
  return '#2563EB'; // Royal Blue for defects
};

const CustomSankeyNode = ({ x, y, width, height, payload, containerWidth, labelColor = '#0F172A' }) => {
  const isOut = x + width + 80 > containerWidth;
  const color = getNodeColor(payload.name);

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        fillOpacity={0.9}
        stroke="#1E293B"
        strokeWidth={1}
        rx={3}
      />
      <text
        x={isOut ? x - 8 : x + width + 8}
        y={y + height / 2}
        textAnchor={isOut ? 'end' : 'start'}
        dy="0.35em"
        fontSize={10.5}
        fontWeight="bold"
        fill={labelColor}
      >
        {payload.name}
      </text>
    </g>
  );
};

const SankeyModal = ({ isOpen, onClose, filteredRows = [], theme = 'light' }) => {
  const isLight = theme === 'light';

  // Extract unique CFA names for the dropdown
  const cfaOptions = useMemo(() => {
    const set = new Set();
    filteredRows.forEach(r => {
      (r.cfaNames || []).forEach(name => set.add(name));
    });
    return Array.from(set).sort();
  }, [filteredRows]);

  const [selectedCfa, setSelectedCfa] = useState('ALL');
  const [maxDefects, setMaxDefects] = useState(6);

  // Filter rows based on selected CFA
  const modalRows = useMemo(() => {
    if (selectedCfa === 'ALL') return filteredRows;
    return filteredRows.filter(r => (r.cfaNames || []).includes(selectedCfa));
  }, [filteredRows, selectedCfa]);

  // Generate Sankey data
  const sankeyData = useMemo(() => {
    return generateSankeyFlowData(modalRows, maxDefects);
  }, [modalRows, maxDefects]);

  // Calculate flow volume and overall match
  const flowStats = useMemo(() => {
    let matchFlow = 0;
    let mismatchFlow = 0;

    const matchNodeIdx = sankeyData.nodes.findIndex(n => n.name.includes('MATCH (ALIGNED)'));
    const mismatchNodeIdx = sankeyData.nodes.findIndex(n => n.name.includes('MIS-MATCH'));

    sankeyData.links.forEach(l => {
      if (l.target === matchNodeIdx) matchFlow += l.value;
      if (l.target === mismatchNodeIdx) mismatchFlow += l.value;
    });

    const totalFlow = matchFlow + mismatchFlow;
    const matchRate = totalFlow > 0 ? Math.round((matchFlow / totalFlow) * 100) : 0;

    return { totalFlow, matchFlow, mismatchFlow, matchRate };
  }, [sankeyData]);

  // Early return must come after all hooks so hook order stays stable when the modal opens
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className={`w-full max-w-5xl rounded-2xl shadow-2xl border flex flex-col max-h-[92vh] overflow-hidden ${
        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#120A38] border-white/20 text-white'
      }`}>
        
        {/* ── HEADER ── */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <svg className="w-6 h-6 text-sky-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-wide">
                DEEP-DIVE DEFECT FLOW ANALYSIS (SANKEY DIAGRAM)
              </h2>
              <p className="text-xs text-blue-100 font-medium">
                Aliran Validasi Defect: Temuan CFA ➔ Tingkat T1QM ➔ Keselarasan Temuan (Match vs Mis-Match)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/25 text-white transition-colors"
            title="Tutup Modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── CONTROLS & STATS BAR ── */}
        <div className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-4 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#180E45] border-white/10'
        }`}>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className={`block text-[10px] font-black uppercase tracking-wider mb-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                FILTER CFA INSPECTOR
              </label>
              <select
                value={selectedCfa}
                onChange={(e) => setSelectedCfa(e.target.value)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-bold outline-none focus:border-blue-600 ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-[#251566] border-white/20 text-white'
                }`}
              >
                <option value="ALL">ALL CFA INSPECTORS ({cfaOptions.length})</option>
                {cfaOptions.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-[10px] font-black uppercase tracking-wider mb-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                MAX DEFECT NODES
              </label>
              <select
                value={maxDefects}
                onChange={(e) => setMaxDefects(Number(e.target.value))}
                className={`text-xs px-3 py-1.5 rounded-lg border font-bold outline-none focus:border-blue-600 ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-[#251566] border-white/20 text-white'
                }`}
              >
                <option value={4}>Top 4 Defects</option>
                <option value={6}>Top 6 Defects (Recommended)</option>
                <option value={8}>Top 8 Defects</option>
                <option value={10}>Top 10 Defects</option>
              </select>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-lg border text-center ${
              isLight ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-blue-900/40 border-blue-700 text-blue-200'
            }`}>
              <div className="text-[9px] font-black uppercase">Total Flow</div>
              <div className="text-sm font-black">{flowStats.totalFlow} Lots</div>
            </div>

            <div className={`px-3 py-1 rounded-lg border text-center ${
              isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-900/40 border-emerald-700 text-emerald-200'
            }`}>
              <div className="text-[9px] font-black uppercase">Match Rate</div>
              <div className="text-sm font-black">{flowStats.matchRate}%</div>
            </div>

            <div className={`px-3 py-1 rounded-lg border text-center ${
              isLight ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-rose-900/40 border-rose-700 text-rose-200'
            }`}>
              <div className="text-[9px] font-black uppercase">Mis-Match</div>
              <div className="text-sm font-black">{flowStats.mismatchFlow} Lots</div>
            </div>
          </div>
        </div>

        {/* ── STAGE INDICATOR STRIP ── */}
        <div className={`grid grid-cols-3 px-8 py-2 border-b text-[11px] font-black tracking-wider uppercase ${
          isLight ? 'bg-slate-200/60 border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-slate-200'
        }`}>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            STAGE 1: CFA DEFECT FINDINGS
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            STAGE 2: T1QM VALIDATION LEVEL
          </div>
          <div className="flex items-center justify-end gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            STAGE 3: ALIGNMENT OUTCOME
          </div>
        </div>

        {/* ── SANKEY DIAGRAM AREA ── */}
        <div className="flex-1 p-6 overflow-y-auto">
          {sankeyData.links.length === 0 ? (
            <div className={`h-[360px] flex flex-col items-center justify-center gap-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              <svg className="w-10 h-10 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm font-bold">Tidak ada aliran defect pada filter ini</div>
              <div className="text-xs">Silakan pilih inspector lain atau reset filter tanggal.</div>
            </div>
          ) : (
            <div className="h-[390px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <Sankey
                  data={sankeyData}
                  nodePadding={24}
                  nodeWidth={16}
                  node={<CustomSankeyNode labelColor={isLight ? '#0F172A' : '#E2E8F0'} />}
                  link={{ stroke: isLight ? '#94A3B8' : '#64748B', strokeOpacity: 0.35 }}
                  margin={{ top: 15, right: 140, bottom: 15, left: 20 }}
                >
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload || payload.length === 0) return null;
                      const data = payload[0];
                      const { source, target, value } = data.payload || {};
                      if (source && target) {
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-xl text-xs border border-slate-700">
                            <div className="font-bold text-sky-300">
                              {source.name} ➔ {target.name}
                            </div>
                            <div className="mt-1 font-semibold">
                              Volume Aliran: <span className="text-white font-black">{value} Lot</span>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-xl text-xs border border-slate-700 font-bold">
                          {data.name}: {data.value} Lot
                        </div>
                      );
                    }}
                  />
                </Sankey>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── FOOTER TAKEAWAY BOX ── */}
        <div className={`px-6 py-3 border-t flex items-center justify-between text-xs ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#180E45] border-white/10 text-slate-300'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`font-black uppercase px-2 py-0.5 rounded text-[10px] ${isLight ? 'text-blue-800 bg-blue-100' : 'text-blue-200 bg-blue-500/20'}`}>
              Analytic Insight
            </span>
            <span className="font-semibold">
              Diagram ini menghubungkan temuan awal CFA hingga status verifikasi akhir oleh T1QM 1, 2, dan 3.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-sm"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};

export default SankeyModal;
