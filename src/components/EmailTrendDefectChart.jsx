import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { formatAxisPercent, trendPercentTicks } from '../utils/dataUtils';

// Light email theme: darker yellow / orange so both bars read on white (palette validated)
const EMAIL_BAR_COLORS = { SOILING: '#ca8a04', BONDING: '#c2410c' };
const formatPercent = (value) => { const v = Number(value) || 0; return `${v.toFixed(v > 0 && v < 1 ? 2 : 1).replace('.', ',')}%`; };
const formatQty = (value) => (Number(value) || 0).toLocaleString('id-ID');

const EmailTrendTick = ({ x, y, payload, rows }) => {
  const row = rows.find((r) => r.label === payload.value);
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fill="#0f172a" fontSize={10.5} fontWeight="bold">
        {payload.value}
      </text>
      <text x={0} y={0} dy={24} textAnchor="middle" fill="#64748b" fontSize={9}>
        {row ? `${formatQty(row.qty)} pcs` : ''}
      </text>
    </g>
  );
};

// TREND DEFECT bar chart for the email PDF exports (PSI LV.2, AQL 3rd Party):
// Soiling / Bonding as Total Defect / qty inspection (%).
// rows: computeTrendDefectFromRows() output — [{ key, label, qty, inspection, rate }]
const EmailTrendDefectChart = ({ rows = [], height = 170 }) => {
  const maxRate = Math.max(...rows.map((r) => r.rate), 0);
  const ticks = trendPercentTicks(maxRate);

  return (
    <div style={{ backgroundColor: '#fffbeb', border: '2px solid #f59e0b', padding: '8px', borderRadius: '3px' }}>
      <div
        style={{
          fontSize: '11px', fontWeight: 900, color: '#000000', textAlign: 'center', textTransform: 'uppercase',
          letterSpacing: '1px', background: 'linear-gradient(90deg, #facc15, #f97316)', padding: '4px 0', borderRadius: '2px'
        }}
      >
        TREND DEFECT
      </div>
      <div style={{ fontSize: '8.5px', color: '#78350f', textAlign: 'center', margin: '3px 0 2px' }}>
        % Defect = Total Defect / Qty Inspection
      </div>
      <div style={{ width: '100%', height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 18, right: 10, left: 0, bottom: 14 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" vertical={false} />
            <XAxis dataKey="label" interval={0} tick={<EmailTrendTick rows={rows} />} axisLine={{ stroke: '#f59e0b' }} tickLine={false} />
            <YAxis domain={[0, ticks[ticks.length - 1]]}
              ticks={ticks} tickFormatter={formatAxisPercent} tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} width={42} />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={60} isAnimationActive={false}>
              {rows.map((r) => <Cell key={r.key} fill={EMAIL_BAR_COLORS[r.key]} />)}
              <LabelList dataKey="rate" position="top" formatter={formatPercent} fill="#0f172a" fontSize={11} fontWeight="bold" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EmailTrendDefectChart;
