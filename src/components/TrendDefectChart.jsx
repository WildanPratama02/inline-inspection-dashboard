import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { computeTrendDefectRates, formatAxisPercent, trendPercentTicks } from '../utils/dataUtils';

// Yellow (Soiling) / orange (Bonding) — the highlight colours of the Trend Defect panel.
// Each bar is also named on the axis, so identity never relies on colour alone.
const TREND_BAR_COLORS = { SOILING: '#eab308', BONDING: '#ea580c' };

// 1 decimal, 2 when below 1% so small rates (CFA) stay readable
const formatTrendPercent = (value) => { const v = Number(value) || 0; return `${v.toFixed(v > 0 && v < 1 ? 2 : 1).replace('.', ',')}%`; };
const formatQty = (value) => (Number(value) || 0).toLocaleString('id-ID');

// Axis tick: group name + defect qty underneath
const TrendTick = ({ x, y, payload, rows }) => {
  const row = rows.find((r) => r.label === payload.value);
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={14} textAnchor="middle" fill="#ffffff" fontSize={12} fontWeight="bold">
        {payload.value}
      </text>
      <text x={0} y={0} dy={28} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize={10}>
        {row ? `${formatQty(row.qty)} pcs` : ''}
      </text>
    </g>
  );
};

const TrendTooltip = ({ active, payload, qtyInspection }) => {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload;
  return (
    <div style={{ backgroundColor: '#1A0F5A', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 10px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, color: '#ffffff' }}>{row.label}</div>
      <div style={{ color: 'rgba(255,255,255,0.85)' }}>
        {formatTrendPercent(row.rate)} — {formatQty(row.qty)} / {formatQty(qtyInspection)} pcs
      </div>
    </div>
  );
};

// TREND DEFECT bar chart: Soiling (contamination + over cementing) and Bonding (bonding gap),
// each as defect qty / qty inspection (%). `defects` = every defect name with its total qty.
// denominatorLabel: what qtyInspection is (CFA divides by Sample Lot)
const TrendDefectChart = ({ defects = [], qtyInspection = 0, denominatorLabel = 'Qty Inspection', height = 210, className = '' }) => {
  const rows = useMemo(() => computeTrendDefectRates(defects, qtyInspection), [defects, qtyInspection]);
  const maxRate = Math.max(...rows.map((r) => r.rate), 0);
  const ticks = trendPercentTicks(maxRate);

  return (
    <div className={`border-2 border-amber-400/80 bg-amber-500/10 px-2 pt-2 pb-1 rounded-sm flex flex-col ${className}`}>
      <h2 className="text-sm font-bold text-center uppercase tracking-widest text-black bg-gradient-to-r from-yellow-400 to-orange-500 rounded-sm py-1">
        Trend Defect
      </h2>
      <div className="text-[10px] text-center text-amber-100/70 mt-1">% Defect = Qty Defect / {denominatorLabel}</div>
      <div style={{ height: `${height}px`, minHeight: `${height}px` }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 22, right: 12, left: 0, bottom: 18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis
              dataKey="label"
              interval={0}
              tick={<TrendTick rows={rows} />}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, ticks[ticks.length - 1]]}
              ticks={ticks}
              tickFormatter={formatAxisPercent}
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={46}
            />
            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.08)' }} content={<TrendTooltip qtyInspection={qtyInspection} />} />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={70} isAnimationActive={false}>
              {rows.map((r) => <Cell key={r.key} fill={TREND_BAR_COLORS[r.key]} />)}
              <LabelList dataKey="rate" position="top" formatter={formatTrendPercent} fill="#ffffff" style={{ fontSize: '13px', fontWeight: 'bold' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TrendDefectChart;
