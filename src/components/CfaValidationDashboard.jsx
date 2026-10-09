import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList
} from 'recharts';
import MultiSelect from './MultiSelect';
import DateRangePicker from './DateRangePicker';
import SankeyModal from './SankeyModal';
import {
  buildCfaValidationDataset,
  calculateCfaValidationMetrics
} from '../utils/cfaValidationUtils.js';

// High-contrast color palette for Light Theme
const COLOR_T1QM1 = '#2563EB'; // Bold Royal Blue
const COLOR_T1QM2 = '#DC2626'; // High-contrast Red
const COLOR_T1QM3 = '#D97706'; // Deep Amber / Orange

const DONUT_COLORS = [
  '#1D4ED8', '#0284C7', '#0F766E', '#059669', '#D97706',
  '#DC2626', '#7C3AED', '#DB2777', '#475569', '#0891B2'
];

/**
 * Shorten long inspector names for clean XAxis rendering
 * e.g. "ALFINDA DWI FIRMANSYAH" -> "ALFINDA D. F."
 */
const formatShortCfaName = (name) => {
  if (!name) return '';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} ${parts[1].charAt(0)}.`;
  return `${parts[0]} ${parts.slice(1).map(p => p.charAt(0) + '.').join(' ')}`;
};

const CfaValidationDashboard = ({ rawData = [], onFilteredRowsChange }) => {
  // Theme state: default to 'light' as requested
  const [theme, setTheme] = useState('light');
  const isDark = theme === 'dark';
  const [isSankeyOpen, setIsSankeyOpen] = useState(false);

  // 1. Build joined CFA-T1QM dataset in memory
  const fullDataset = useMemo(() => {
    return buildCfaValidationDataset(rawData);
  }, [rawData]);

  // 2. Extract options for filters
  const filterOptions = useMemo(() => {
    const cfaNames = new Set();
    const t1qmInspectors = new Set();
    const historicalPos = new Set();

    fullDataset.forEach(row => {
      row.cfaNames.forEach(name => cfaNames.add(name));
      if (row.historicalPo) historicalPos.add(row.historicalPo);
      if (row.t1qmInspectors) {
        row.t1qmInspectors.forEach(insp => t1qmInspectors.add(insp));
      }
    });

    return {
      cfaNames: Array.from(cfaNames).sort(),
      checkByT1qm: Array.from(t1qmInspectors).sort(),
      historicalPos: Array.from(historicalPos).sort(),
      destCategories: ['REGULAR', 'CRITICAL']
    };
  }, [fullDataset]);

  // 3. Filter states
  const [startDate, setStartDate] = useState('ALL');
  const [endDate, setEndDate] = useState('ALL');
  const [cfaNames, setCfaNames] = useState([]);
  const [checkByT1qm, setCheckByT1qm] = useState([]);
  const [historicalPos, setHistoricalPos] = useState([]);
  const [destinationCategory, setDestinationCategory] = useState('ALL');
  const [tableSearch, setTableSearch] = useState('');

  const handleResetFilters = () => {
    setStartDate('ALL');
    setEndDate('ALL');
    setCfaNames([]);
    setCheckByT1qm([]);
    setHistoricalPos([]);
    setDestinationCategory('ALL');
    setTableSearch('');
  };

  // 4. Calculate aggregated metrics based on current filters
  const metrics = useMemo(() => {
    return calculateCfaValidationMetrics(fullDataset, {
      cfaNames,
      checkByT1qm,
      historicalPos,
      destinationCategory,
      startDate,
      endDate
    });
  }, [fullDataset, cfaNames, checkByT1qm, historicalPos, destinationCategory, startDate, endDate]);

  const {
    t1qmPassRates,
    cfaSummaryTable,
    cfaGroupedPassRates,
    destinationBarData,
    destinationLineData,
    top10Defects,
    defectMatrixData,
    filteredRowsCount
  } = metrics;

  // Share the filtered rows with the page-level EXPORT EXCEL menu
  useEffect(() => {
    if (onFilteredRowsChange) onFilteredRowsChange(metrics.filteredRows || []);
  }, [metrics.filteredRows, onFilteredRowsChange]);

  // Filtered table rows based on quick search
  const filteredTable = useMemo(() => {
    if (!tableSearch) return cfaSummaryTable;
    return cfaSummaryTable.filter(item =>
      item.cfaName.toLowerCase().includes(tableSearch.toLowerCase())
    );
  }, [cfaSummaryTable, tableSearch]);

  // Total defects count for Donut center
  const totalT1qmDefectSum = useMemo(() => {
    return top10Defects.reduce((acc, curr) => acc + curr.count, 0);
  }, [top10Defects]);

  // Theme styling classes with enhanced light contrast
  const themeClasses = {
    wrapper: isDark
      ? 'bg-[#0A0520] text-slate-100'
      : 'bg-[#F1F5F9] text-slate-900',
    card: isDark
      ? 'bg-[#120A38] border border-white/10 shadow-lg text-slate-100'
      : 'bg-white border-2 border-slate-200/90 shadow-md text-slate-900',
    cardHeader: isDark
      ? 'text-slate-100 border-white/10'
      : 'text-slate-900 border-slate-200',
    filterBar: isDark
      ? 'bg-[#150B42] border border-white/15 shadow-md'
      : 'bg-white border-2 border-slate-200/90 shadow-md',
    gridColor: isDark ? '#231654' : '#CBD5E1',
    tickColor: isDark ? '#E2E8F0' : '#0F172A',
    tooltipBg: isDark ? '#1C104E' : '#0F172A',
    tooltipBorder: isDark ? '#3E2A88' : '#334155',
    subText: isDark ? 'text-slate-300' : 'text-slate-700',
    mutedText: isDark ? 'text-slate-400' : 'text-slate-500',
    strongText: isDark ? 'text-white' : 'text-slate-900',
    rowText: isDark ? 'text-slate-100' : 'text-slate-800',
    rowHover: isDark ? 'hover:bg-white/5' : 'hover:bg-blue-50/80',
    divider: isDark ? 'divide-white/10' : 'divide-slate-100',
    chip: isDark
      ? 'bg-white/10 text-slate-200 border border-white/15'
      : 'bg-slate-100 text-slate-700 border border-slate-200',
    chipBlue: isDark
      ? 'bg-blue-500/20 text-blue-200 border border-blue-400/40'
      : 'bg-blue-100 text-blue-800 border border-blue-200',
    tableHead: isDark
      ? 'bg-white/10 text-slate-200 border-white/10'
      : 'bg-slate-100/90 text-slate-800 border-slate-200',
    sankeyButton: isDark
      ? 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border-indigo-400/40'
      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200',
    legendBlue: isDark ? 'text-blue-300' : 'text-blue-700',
    legendRed: isDark ? 'text-red-300' : 'text-red-700',
    legendAmber: isDark ? 'text-amber-300' : 'text-amber-700'
  };

  // Tooltip text stays light on the dark tooltip box in both themes;
  // series colors (e.g. blue on navy) are too low-contrast for item text
  const tooltipContentStyle = {
    backgroundColor: themeClasses.tooltipBg,
    borderColor: themeClasses.tooltipBorder,
    color: '#fff',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: 'bold'
  };
  const tooltipItemStyle = { color: '#F1F5F9' };

  return (
    <div className={`themed-charts w-full flex flex-col gap-4 rounded-xl p-3 md:p-5 transition-colors duration-300 ${themeClasses.wrapper}`}>
      
      {/* ── TOP BANNER HEADER ── */}
      <div className={`w-full ${isDark ? 'bg-gradient-to-r from-[#1E1B4B] via-[#1E293B] to-[#0F172A] border border-white/15' : 'bg-gradient-to-r from-[#0284c7] via-[#0369a1] to-[#1e3a8a]'} text-white px-5 py-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-lg`}>
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-md flex items-center justify-center shadow-inner">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-black tracking-wide uppercase drop-shadow-sm">
                DASHBOARD CFA VALIDATION by T1QM
              </h1>
              <span className="bg-white/25 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                Active
              </span>
            </div>
            <p className="text-xs text-blue-100 font-semibold mt-0.5">
              Defect Alignment & Verification Matrix per PO • <span className="font-extrabold text-white underline underline-offset-2">{filteredRowsCount} Records Found</span>
            </p>
          </div>
        </div>

        {/* Right side: Logos & Theme Switcher */}
        <div className="flex items-center gap-3">
          {/* Deep-Dive Sankey Button */}
          <button
            onClick={() => setIsSankeyOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 border shadow-sm bg-white/20 hover:bg-white/30 text-white border-white/30"
            title="Buka Analisis Alur Validasi Defect (Sankey Diagram)"
          >
            <span>🌊</span>
            <span>Defect Flow (Sankey)</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 border shadow-sm ${
              isDark
                ? 'bg-white/10 hover:bg-white/20 text-amber-300 border-white/20'
                : 'bg-white/20 hover:bg-white/30 text-white border-white/30'
            }`}
            title="Toggle Dashboard Theme"
          >
            {isDark ? (
              <>
                <span>🌙</span>
                <span>Dark Theme</span>
              </>
            ) : (
              <>
                <span>☀️</span>
                <span>Light Theme</span>
              </>
            )}
          </button>

          {/* Logos: Parkland & Adidas motif */}
          <div className="flex items-center gap-2.5 bg-white/15 px-3 py-1.5 rounded-lg border border-white/20 backdrop-blur-sm shadow-sm">
            <img src="/parkland-logo.svg" alt="Parkland Logo" className="h-6 w-auto object-contain brightness-0 invert" />
            <div className="h-5 w-[1.5px] bg-white/40 mx-0.5"></div>
            {/* Stylized Adidas 3 Stripes */}
            <svg className="h-5 w-7 text-white" viewBox="0 0 100 60" fill="currentColor">
              <polygon points="10,60 25,60 45,25 30,25" />
              <polygon points="40,60 55,60 75,10 60,10" />
              <polygon points="70,60 85,60 95,0 80,0" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── FILTER BAR: INSPECTION DATE MOVED TO LEFT SIDE ── */}
      <div className={`w-full p-4 rounded-xl border flex flex-wrap items-center gap-3.5 transition-colors ${themeClasses.filterBar}`}>
        
        {/* 1. INSPECTION DATE (LEFT-MOST) */}
        <div className="min-w-[210px] flex-1">
          <label className={`block text-[10px] uppercase font-black mb-1 tracking-wider ml-1 ${themeClasses.subText}`}>
            INSPECTION DATE
          </label>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            theme={theme}
            onRangeChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
          />
        </div>

        {/* 2. CFA NAME */}
        <div className="min-w-[170px] flex-1">
          <MultiSelect
            label="CFA NAME"
            options={filterOptions.cfaNames}
            selected={cfaNames}
            onChange={setCfaNames}
            theme={theme}
          />
        </div>

        {/* 3. CHECK BY T1QM */}
        <div className="min-w-[170px] flex-1">
          <MultiSelect
            label="CHECK BY T1QM"
            options={filterOptions.checkByT1qm}
            selected={checkByT1qm}
            onChange={setCheckByT1qm}
            theme={theme}
          />
        </div>

        {/* 4. HISTORYCAL PO */}
        <div className="min-w-[160px] flex-1">
          <MultiSelect
            label="HISTORYCAL PO"
            options={filterOptions.historicalPos}
            selected={historicalPos}
            onChange={setHistoricalPos}
            theme={theme}
          />
        </div>

        {/* 5. DESTINATION CATEGORY */}
        <div className="min-w-[150px] flex-1">
          <label className={`block text-[10px] uppercase font-black mb-1 tracking-wider ml-1 ${themeClasses.subText}`}>
            DESTINATION CATEGORY
          </label>
          <select
            value={destinationCategory}
            onChange={(e) => setDestinationCategory(e.target.value)}
            className={`w-full text-xs px-3 py-1.5 rounded focus:outline-none font-bold border transition-colors ${
              isDark
                ? 'bg-[#1A0F5A] text-white border-white/20 focus:border-sky-400'
                : 'bg-white text-slate-900 border-slate-300 focus:border-blue-600 shadow-sm'
            }`}
          >
            <option value="ALL">ALL CATEGORY</option>
            <option value="REGULAR">REGULAR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>

        {/* 6. RESET FILTER BUTTON */}
        <div className="flex items-end pt-5">
          <button
            onClick={handleResetFilters}
            className={`font-black px-4 py-1.5 text-xs rounded transition-colors flex items-center gap-1.5 border shadow-sm ${
              isDark
                ? 'bg-white/10 hover:bg-white/20 text-slate-100 border-white/20'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'
            }`}
            title="Reset All Filters"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset Filter
          </button>
        </div>
      </div>

      {/* ── ROW 1: PASSRATE T1QM, CFA TABLE, GROUPED BAR ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Card 1: Pass Rate Validation T1QM (3 Cols) */}
        <div className={`lg:col-span-3 p-4 rounded-xl flex flex-col ${themeClasses.card}`}>
          <div className={`flex items-center justify-between mb-3 border-b pb-2 ${themeClasses.cardHeader}`}>
            <h2 className="text-xs font-black uppercase tracking-wider">
              PASSRATE (%) VALIDATION T1QM
            </h2>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${themeClasses.chipBlue}`}>
              AVERAGE
            </span>
          </div>
          <div className="h-[215px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={t1qmPassRates} margin={{ top: 22, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={themeClasses.gridColor} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: '800', fill: themeClasses.tickColor }} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} allowDataOverflow tick={{ fontSize: 10, fontWeight: '700', fill: themeClasses.tickColor }} unit="%" />
                <Tooltip
                  formatter={(val) => [`${val}%`, 'Pass Rate']}
                  contentStyle={tooltipContentStyle}
                  itemStyle={tooltipItemStyle}
                />
                <Bar dataKey="passRate" fill={COLOR_T1QM1} radius={[6, 6, 0, 0]}>
                  <LabelList
                    dataKey="passRate"
                    position="top"
                    formatter={(v) => `${v}%`}
                    style={{ fontSize: 11, fontWeight: '900', fill: isDark ? '#60A5FA' : '#0F172A' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: CFA Name vs Pass Rate Table (3 Cols) */}
        <div className={`lg:col-span-3 p-4 rounded-xl flex flex-col ${themeClasses.card}`}>
          <div className={`flex items-center justify-between mb-2 border-b pb-2 ${themeClasses.cardHeader}`}>
            <h2 className="text-xs font-black uppercase tracking-wider">
              CFA Pass Rate Summary
            </h2>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${themeClasses.chip}`}>
              {cfaSummaryTable.length} Inspectors
            </span>
          </div>

          {/* Quick search input */}
          <div className="mb-2">
            <input
              type="text"
              placeholder="Search CFA Inspector..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className={`w-full px-2.5 py-1 text-xs rounded border transition-colors font-semibold ${
                isDark
                  ? 'bg-black/30 border-white/10 text-white placeholder-slate-400'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-600 shadow-inner'
              }`}
            />
          </div>

          <div className={`flex justify-between items-center px-2 py-1.5 text-[10px] font-black uppercase rounded border mb-1 ${themeClasses.tableHead}`}>
            <span>CFA NAME</span>
            <span>PASS RATE</span>
          </div>

          <div className={`flex-1 overflow-y-auto max-h-[170px] pr-1 divide-y text-xs ${themeClasses.divider}`}>
            {filteredTable.length === 0 ? (
              <div className={`p-4 text-center font-bold text-xs ${themeClasses.mutedText}`}>No records found</div>
            ) : (
              filteredTable.map((row, idx) => {
                const numRate = parseFloat(row.passRate) || 0;
                const badgeColor =
                  numRate >= 95
                    ? (isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300')
                    : numRate >= 90
                    ? (isDark ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-800 border-amber-300')
                    : (isDark ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-rose-100 text-rose-800 border-rose-300');

                return (
                  <div key={idx} className={`flex justify-between items-center py-1.5 px-2 transition-colors rounded ${themeClasses.rowHover}`}>
                    <span className={`font-bold truncate max-w-[140px] ${themeClasses.rowText}`} title={row.cfaName}>
                      {row.cfaName}
                    </span>
                    <span className={`font-black px-2 py-0.5 rounded text-[11px] border ${badgeColor}`}>
                      {row.passRate}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Card 3: Pass Rate T1QM 1, 2, 3 per CFA Name (6 Cols) */}
        <div className={`lg:col-span-6 p-4 rounded-xl flex flex-col ${themeClasses.card}`}>
          <div className={`flex flex-wrap items-center justify-between mb-3 border-b pb-2 ${themeClasses.cardHeader} gap-2`}>
            <h2 className="text-xs font-black uppercase tracking-wider">
              Pass Rate (%) Validation by T1QM Level per CFA
            </h2>
            <div className="flex items-center gap-3 text-[10px] font-black">
              <span className={`flex items-center gap-1.5 ${themeClasses.legendBlue}`}>
                <span className="w-2.5 h-2.5 bg-blue-600 rounded-sm inline-block shadow-sm"></span> T1QM 1
              </span>
              <span className={`flex items-center gap-1.5 ${themeClasses.legendRed}`}>
                <span className="w-2.5 h-2.5 bg-red-600 rounded-sm inline-block shadow-sm"></span> T1QM 2
              </span>
              <span className={`flex items-center gap-1.5 ${themeClasses.legendAmber}`}>
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-sm inline-block shadow-sm"></span> T1QM 3
              </span>
            </div>
          </div>
          <div className="h-[215px] w-full overflow-x-auto">
            <ResponsiveContainer width="100%" minWidth={cfaGroupedPassRates.length * 62} height="100%">
              <BarChart data={cfaGroupedPassRates} margin={{ top: 20, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={themeClasses.gridColor} />
                <XAxis
                  dataKey="cfaName"
                  tickFormatter={formatShortCfaName}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                  height={50}
                  tick={{ fontSize: 9.5, fontWeight: '700', fill: themeClasses.tickColor }}
                />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} allowDataOverflow tick={{ fontSize: 10, fontWeight: '700', fill: themeClasses.tickColor }} unit="%" />
                <Tooltip
                  formatter={(val, name) => [`${val || 0}%`, name.toUpperCase()]}
                  contentStyle={tooltipContentStyle}
                  itemStyle={tooltipItemStyle}
                />
                <Bar dataKey="t1qm1" name="T1QM 1" fill={COLOR_T1QM1} radius={[3, 3, 0, 0]} />
                <Bar dataKey="t1qm2" name="T1QM 2" fill={COLOR_T1QM2} radius={[3, 3, 0, 0]} />
                <Bar dataKey="t1qm3" name="T1QM 3" fill={COLOR_T1QM3} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ── ROW 2: DESTINATION BREAKDOWN & LINE CHART ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Card 4: Horizontal Bar Regular vs Critical (4 Cols) */}
        <div className={`lg:col-span-4 p-4 rounded-xl flex flex-col ${themeClasses.card}`}>
          <div className={`flex items-center justify-between mb-3 border-b pb-2 ${themeClasses.cardHeader}`}>
            <h2 className="text-xs font-black uppercase tracking-wider">
              Destination Breakdown
            </h2>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${themeClasses.chip}`}>
              Total Inspection Lots
            </span>
          </div>
          <div className="h-[215px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={destinationBarData}
                margin={{ top: 20, right: 45, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={themeClasses.gridColor} />
                <XAxis type="number" tick={{ fontSize: 10, fontWeight: '700', fill: themeClasses.tickColor }} />
                <YAxis
                  type="category"
                  dataKey="category"
                  tick={{ fontSize: 11, fontWeight: '800', fill: themeClasses.tickColor }}
                />
                <Tooltip
                  formatter={(val) => [val.toLocaleString(), 'Inspection Lots']}
                  contentStyle={tooltipContentStyle}
                  itemStyle={tooltipItemStyle}
                />
                <Bar dataKey="count" fill={COLOR_T1QM1} radius={[0, 6, 6, 0]}>
                  <LabelList
                    dataKey="count"
                    position="right"
                    formatter={(v) => v.toLocaleString()}
                    style={{ fontSize: 11, fontWeight: '900', fill: isDark ? '#93C5FD' : '#0F172A' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 5: Line Chart CFA Inspection Regular vs Critical (8 Cols) */}
        <div className={`lg:col-span-8 p-4 rounded-xl flex flex-col ${themeClasses.card}`}>
          <div className={`flex flex-wrap items-center justify-between mb-3 border-b pb-2 ${themeClasses.cardHeader} gap-2`}>
            <h2 className="text-xs font-black uppercase tracking-wider">
              CFA Inspection - Regular vs Critical Destination
            </h2>
            <div className="flex items-center gap-4 text-[10px] font-black">
              <span className={`flex items-center gap-1.5 ${themeClasses.legendBlue}`}>
                <span className="w-2.5 h-2.5 bg-blue-600 rounded-full inline-block shadow-sm"></span> REGULAR DESTINATION
              </span>
              <span className={`flex items-center gap-1.5 ${themeClasses.legendRed}`}>
                <span className="w-2.5 h-2.5 bg-red-600 rounded-full inline-block shadow-sm"></span> CRITICAL DESTINATION
              </span>
            </div>
          </div>
          <div className="h-[215px] w-full overflow-x-auto">
            <ResponsiveContainer width="100%" minWidth={destinationLineData.length * 52} height="100%">
              <LineChart data={destinationLineData} margin={{ top: 22, right: 20, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={themeClasses.gridColor} />
                <XAxis
                  dataKey="cfaName"
                  tickFormatter={formatShortCfaName}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                  height={50}
                  tick={{ fontSize: 9.5, fontWeight: '700', fill: themeClasses.tickColor }}
                />
                <YAxis tick={{ fontSize: 10, fontWeight: '700', fill: themeClasses.tickColor }} />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  itemStyle={tooltipItemStyle}
                />
                <Line
                  type="monotone"
                  dataKey="regular"
                  name="Regular Destination"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#2563EB' }}
                  activeDot={{ r: 5.5 }}
                >
                  <LabelList dataKey="regular" position="top" style={{ fontSize: 9.5, fill: isDark ? '#93C5FD' : '#0F172A', fontWeight: '900' }} />
                </Line>
                <Line
                  type="monotone"
                  dataKey="critical"
                  name="Critical Destination"
                  stroke="#DC2626"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#DC2626' }}
                  activeDot={{ r: 5.5 }}
                >
                  <LabelList dataKey="critical" position="top" style={{ fontSize: 9.5, fill: isDark ? '#FCA5A5' : '#7F1D1D', fontWeight: '900' }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ── ROW 3: TOP 10 DEFECTS & DEFECT MATRIX VALIDATION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Card 6: TOP 10 DEFECT FINDING by T1QM (4 Cols) */}
        <div className={`lg:col-span-4 p-4 rounded-xl flex flex-col ${themeClasses.card}`}>
          <div className={`flex items-center justify-between mb-3 border-b pb-2 ${themeClasses.cardHeader}`}>
            <h2 className="text-xs font-black uppercase tracking-wider">
              TOP 10 DEFECT FINDING by T1QM
            </h2>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${themeClasses.chip}`}>
              {totalT1qmDefectSum} Total Defect
            </span>
          </div>

          <div className="h-[245px] w-full flex items-center justify-center">
            {top10Defects.length === 0 ? (
              <div className={`text-center font-bold text-xs ${themeClasses.mutedText}`}>No Defect Data Recorded</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={top10Defects}
                    dataKey="count"
                    nameKey="name"
                    cx="38%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {top10Defects.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} stroke={isDark ? '#120A38' : '#fff'} strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name, item) => [`${val} (${item.payload.percent}%)`, name]}
                    contentStyle={tooltipContentStyle}
                    itemStyle={tooltipItemStyle}
                  />
                  {/* Custom high-contrast legend list on right */}
                  <foreignObject x="64%" y="5%" width="36%" height="90%">
                    <div className="h-full overflow-y-auto pr-1 flex flex-col gap-1 text-[9.5px]">
                      {top10Defects.map((d, i) => (
                        <div key={i} className="flex items-center gap-1.5 truncate" title={`${d.name} (${d.percent}%)`}>
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                          ></span>
                          <span className={`truncate flex-1 font-bold ${themeClasses.rowText}`}>{d.name}</span>
                          <span className={`font-black ${themeClasses.strongText}`}>{d.percent}%</span>
                        </div>
                      ))}
                    </div>
                  </foreignObject>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Card 7: Defect Matrix Validation by T1QM (8 Cols) */}
        <div className={`lg:col-span-8 p-4 rounded-xl flex flex-col ${themeClasses.card}`}>
          <div className={`flex flex-wrap items-center justify-between mb-3 border-b pb-2 ${themeClasses.cardHeader} gap-2`}>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-black uppercase tracking-wider">
                  Defect Matrix Validation by T1QM (% Alignment)
                </h2>
                <button
                  onClick={() => setIsSankeyOpen(true)}
                  className={`px-2.5 py-0.5 text-[10px] font-black uppercase rounded border transition-colors flex items-center gap-1 shadow-sm ${themeClasses.sankeyButton}`}
                  title="Lihat Aliran Defect Detail dengan Sankey Diagram"
                >
                  <span>🌊</span>
                  <span>Trace Flow (Sankey)</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-black">
              <span className={`flex items-center gap-1.5 ${themeClasses.legendBlue}`}>
                <span className="w-2.5 h-2.5 bg-blue-600 rounded-sm inline-block shadow-sm"></span> Match Rate %
              </span>
              <span className={`flex items-center gap-1.5 ${themeClasses.legendRed}`}>
                <span className="w-2.5 h-2.5 bg-red-600 rounded-sm inline-block shadow-sm"></span> Mis-Match Rate %
              </span>
            </div>
          </div>
          <div className="h-[225px] w-full overflow-x-auto">
            <ResponsiveContainer width="100%" minWidth={defectMatrixData.length * 56} height="100%">
              <BarChart data={defectMatrixData} margin={{ top: 20, right: 20, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={themeClasses.gridColor} />
                <XAxis
                  dataKey="cfaName"
                  tickFormatter={formatShortCfaName}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                  height={50}
                  tick={{ fontSize: 9.5, fontWeight: '700', fill: themeClasses.tickColor }}
                />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} allowDataOverflow tick={{ fontSize: 10, fontWeight: '700', fill: themeClasses.tickColor }} unit="%" />
                <Tooltip
                  formatter={(val, name, item) => {
                    const count = item.dataKey === 'matchRate' ? item.payload.matchCount : item.payload.mismatchCount;
                    return [`${val}% (${count} level)`, name];
                  }}
                  contentStyle={tooltipContentStyle}
                  itemStyle={tooltipItemStyle}
                />
                <Bar dataKey="matchRate" name="Match Rate %" stackId="matrix" fill="#2563EB" radius={[0, 0, 0, 0]}>
                  <LabelList
                    dataKey="matchRate"
                    position="center"
                    formatter={(v) => (v >= 20 ? `${v}%` : '')}
                    style={{ fontSize: 10, fontWeight: '900', fill: '#FFFFFF' }}
                  />
                </Bar>
                <Bar dataKey="mismatchRate" name="Mis-Match Rate %" stackId="matrix" fill="#DC2626" radius={[0, 0, 0, 0]}>
                  <LabelList
                    dataKey="mismatchRate"
                    position="center"
                    formatter={(v) => (v >= 20 ? `${v}%` : '')}
                    style={{ fontSize: 10, fontWeight: '900', fill: '#FFFFFF' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ── SANKEY MODAL DIALOG ── */}
      <SankeyModal
        isOpen={isSankeyOpen}
        onClose={() => setIsSankeyOpen(false)}
        filteredRows={metrics.filteredRows || fullDataset}
        theme={theme}
      />

    </div>
  );
};

export default CfaValidationDashboard;
