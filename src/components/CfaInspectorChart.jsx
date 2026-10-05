import React, { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { findKey } from '../utils/dataUtils';

/* ─── helpers ─────────────────────────────────────────────────── */
const formatPct = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? '0,0%' : n.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
};

/* ─── Custom Tooltip ──────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  const passRate = payload.find((p) => p.dataKey === 'passRate');
  const pass = payload.find((p) => p.dataKey === 'pass');
  const fail = payload.find((p) => p.dataKey === 'fail');
  const total = payload.find((p) => p.dataKey === 'total');

  return (
    <div
      style={{
        background: 'rgba(15,23,42,0.95)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 11,
        minWidth: 180,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 12, color: '#fff', marginBottom: 8, letterSpacing: '0.05em' }}>
        👤 {label}
      </div>
      {pass && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: '#34d399', fontWeight: 700, marginBottom: 3 }}>
          <span>PASS</span><span>{pass.value}</span>
        </div>
      )}
      {fail && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: '#f87171', fontWeight: 700, marginBottom: 3 }}>
          <span>FAIL</span><span>{fail.value}</span>
        </div>
      )}
      {total && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: '#60a5fa', fontWeight: 700, marginBottom: 3 }}>
          <span>TOTAL</span><span>{total.value}</span>
        </div>
      )}
      {passRate && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: '#fff', fontWeight: 800, marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 6 }}>
          <span>PASS RATE</span><span>{formatPct(passRate.value)}</span>
        </div>
      )}
    </div>
  );
};

/* ─── Custom Legend ───────────────────────────────────────────── */
const CustomLegend = () => (
  <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 4, flexWrap: 'wrap' }}>
    {[
      { color: '#22c55e', label: 'PASS' },
      { color: '#ef4444', label: 'FAIL' },
      { color: '#3b82f6', label: 'TOTAL' },
      { color: '#a855f7', label: 'PASS RATE', line: true },
    ].map(({ color, label, line }) => (
      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: '0.06em' }}>
        {line ? (
          <svg width="20" height="10">
            <line x1="0" y1="5" x2="14" y2="5" stroke={color} strokeWidth="2.5" strokeDasharray="4 2" />
            <circle cx="17" cy="5" r="3" fill={color} />
          </svg>
        ) : (
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: color, flexShrink: 0 }} />
        )}
        {label}
      </div>
    ))}
  </div>
);

/* ─── PassRate label ─────────────────────────────────────────── */
const PassRateLabel = ({ x, y, value }) => {
  if (value === undefined || value === null) return null;
  return (
    <text x={x} y={y - 10} fill="#a855f7" fontSize={9} fontWeight={800} textAnchor="middle">
      {formatPct(value)}
    </text>
  );
};

/* ─── Main Component ──────────────────────────────────────────── */
const CfaInspectorChart = ({ data = [], rawData = [] }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const firstItem = rawData[0] || {};
    const inspectorKey = findKey(firstItem, 'inspector', 'inspector_name') || 'inspector';
    const statusKey = findKey(firstItem, 'status_po', 'status po', 'status_inspection', 'status', 'result');

    const inspMap = {};

    data.forEach((item) => {
      const inspector = String(item[inspectorKey] || 'Unknown').trim();
      if (!inspector || inspector === '-' || inspector === '') return;

      if (!inspMap[inspector]) {
        inspMap[inspector] = { total: 0, pass: 0, fail: 0 };
      }

      inspMap[inspector].total += 1;

      if (statusKey && item[statusKey] !== undefined && item[statusKey] !== null && item[statusKey] !== '') {
        const s = String(item[statusKey]).trim().toUpperCase();
        if (s.includes('FAIL') || s.includes('REJECT') || s === 'F') {
          inspMap[inspector].fail += 1;
        } else if (s.includes('PASS') || s.includes('APPROV') || s === 'P') {
          inspMap[inspector].pass += 1;
        }
      }
    });

    return Object.entries(inspMap)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 10) // Top 10 inspectors
      .map(([name, stats]) => {
        const evaluated = stats.pass + stats.fail;
        const passRate = evaluated > 0 ? parseFloat(((stats.pass / evaluated) * 100).toFixed(1)) : 0;
        return { name, pass: stats.pass, fail: stats.fail, total: stats.total, passRate };
      });
  }, [data, rawData]);

  const totals = useMemo(() => {
    const pass = chartData.reduce((s, r) => s + r.pass, 0);
    const fail = chartData.reduce((s, r) => s + r.fail, 0);
    const total = chartData.reduce((s, r) => s + r.total, 0);
    const evaluated = pass + fail;
    const passRate = evaluated > 0 ? parseFloat(((pass / evaluated) * 100).toFixed(1)) : 0;
    return { pass, fail, total, passRate };
  }, [chartData]);

  if (chartData.length === 0) return null;

  const chartHeight = Math.max(220, chartData.length * 45);

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 6,
        padding: '14px 12px 10px',
        width: '100%',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.10)',
        paddingBottom: 8, flexWrap: 'wrap', gap: 6,
      }}>
        <h3 style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.9)', margin: 0 }}>
          👤 CFA INSPECTOR PERFORMANCE
        </h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 700, background: 'rgba(255,255,255,0.10)', borderRadius: 4, padding: '2px 8px' }}>
            TOTAL: {totals.total}
          </span>
          <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(34,197,94,0.20)', color: '#4ade80', borderRadius: 4, padding: '2px 8px' }}>
            PASS: {totals.pass}
          </span>
          <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(239,68,68,0.20)', color: '#f87171', borderRadius: 4, padding: '2px 8px' }}>
            FAIL: {totals.fail}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 800, borderRadius: 4, padding: '2px 8px',
            background: totals.passRate >= 90 ? 'rgba(34,197,94,0.20)' : totals.passRate >= 70 ? 'rgba(251,191,36,0.20)' : 'rgba(239,68,68,0.20)',
            color: totals.passRate >= 90 ? '#4ade80' : totals.passRate >= 70 ? '#fcd34d' : '#f87171',
          }}>
            PASS RATE: {formatPct(totals.passRate)}
          </span>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={chartHeight}>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 20, left: 0, bottom: chartData.length > 5 ? 40 : 10 }}
          barCategoryGap="25%"
          barGap={3}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />

          <YAxis
            yAxisId="count"
            orientation="left"
            tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            width={30}
            allowDecimals={false}
          />

          <YAxis
            yAxisId="rate"
            orientation="right"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            width={38}
          />

          <XAxis
            dataKey="name"
            tick={{ fill: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={chartData.length > 4 ? -35 : 0}
            textAnchor={chartData.length > 4 ? 'end' : 'middle'}
            height={chartData.length > 4 ? 56 : 28}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />

          <Bar yAxisId="count" dataKey="pass" name="PASS" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={40}>
            <LabelList dataKey="pass" position="top" style={{ fill: '#86efac', fontSize: 9, fontWeight: 700 }} />
          </Bar>

          <Bar yAxisId="count" dataKey="fail" name="FAIL" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={40}>
            <LabelList dataKey="fail" position="top" style={{ fill: '#fca5a5', fontSize: 9, fontWeight: 700 }} />
          </Bar>

          <Bar yAxisId="count" dataKey="total" name="TOTAL" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={40}>
            <LabelList dataKey="total" position="top" style={{ fill: '#93c5fd', fontSize: 9, fontWeight: 700 }} />
          </Bar>

          <Line
            yAxisId="rate"
            type="monotone"
            dataKey="passRate"
            name="PASS RATE"
            stroke="#a855f7"
            strokeWidth={2.5}
            dot={{ fill: '#a855f7', r: 5, strokeWidth: 2, stroke: 'rgba(168,85,247,0.3)' }}
            activeDot={{ r: 7, fill: '#c084fc', stroke: 'rgba(168,85,247,0.4)', strokeWidth: 2 }}
            strokeDasharray="5 3"
          >
            <LabelList content={<PassRateLabel />} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>

      <CustomLegend />
    </div>
  );
};

export default CfaInspectorChart;
