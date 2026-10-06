import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

/* ─── Colors ────────────────────────────────────────────────── */
const SEVERITY_COLORS = {
  MINOR: '#3b82f6',    // blue
  MAJOR: '#f59e0b',    // amber
  CRITICAL: '#ef4444', // red
};

/* ─── Custom Tooltip ────────────────────────────────────────── */
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const { name, value, payload: data } = payload[0];
  return (
    <div
      style={{
        background: 'rgba(15,23,42,0.95)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 11,
        minWidth: 140,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 12, color: data.color || '#fff', marginBottom: 4 }}>
        {name}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: '#fff', fontWeight: 700 }}>
        <span>Total</span><span>{value}</span>
      </div>
      {data.percentage !== undefined && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginTop: 2 }}>
          <span>Percentage</span><span>{data.percentage}%</span>
        </div>
      )}
    </div>
  );
};

/* ─── Custom label renderer ─────────────────────────────────── */
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value, percentage }) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 18;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="rgba(255,255,255,0.85)"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={10}
      fontWeight={700}
    >
      {name}: {value} ({percentage}%)
    </text>
  );
};

/* ─── Main Component ────────────────────────────────────────── */
const CfaSeverityChart = ({ data = [] }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    let totalMinor = 0;
    let totalMajor = 0;
    let totalCritical = 0;

    data.forEach(item => {
      totalMinor += parseInt(item.total_minor) || 0;
      totalMajor += parseInt(item.total_major) || 0;
      totalCritical += parseInt(item.total_critical) || 0;
    });

    const total = totalMinor + totalMajor + totalCritical;
    if (total === 0) return [];

    const result = [];
    if (totalMinor > 0) {
      result.push({
        name: 'MINOR',
        value: totalMinor,
        percentage: ((totalMinor / total) * 100).toFixed(1),
        color: SEVERITY_COLORS.MINOR,
      });
    }
    if (totalMajor > 0) {
      result.push({
        name: 'MAJOR',
        value: totalMajor,
        percentage: ((totalMajor / total) * 100).toFixed(1),
        color: SEVERITY_COLORS.MAJOR,
      });
    }
    if (totalCritical > 0) {
      result.push({
        name: 'CRITICAL',
        value: totalCritical,
        percentage: ((totalCritical / total) * 100).toFixed(1),
        color: SEVERITY_COLORS.CRITICAL,
      });
    }

    return result;
  }, [data]);

  const total = chartData.reduce((s, d) => s + d.value, 0);

  if (chartData.length === 0) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 6,
        padding: '14px 12px 10px',
        width: '100%',
      }}>
        <h3 style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.9)', margin: 0, marginBottom: 8 }}>
          🔍 DEFECT CLASIFICATION BREAKDOWN
        </h3>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 11, padding: '20px 0' }}>
          No defect data available
        </div>
      </div>
    );
  }

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
          🔍 DEFECT CLASIFICATION BREAKDOWN
        </h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 700, background: 'rgba(255,255,255,0.10)', borderRadius: 4, padding: '2px 8px' }}>
            TOTAL: {total}
          </span>
        </div>
      </div>

      {/* Chart + Legend side by side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 260 }}>
        {/* Donut */}
        <div style={{ width: 160, height: 160, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={65}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
                isAnimationActive={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          {chartData.map((entry) => (
            <div key={entry.name} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 6,
              padding: '8px 12px',
              border: `1px solid ${entry.color}30`,
            }}>
              <span style={{
                display: 'inline-block',
                width: 12, height: 12,
                borderRadius: 3,
                background: entry.color,
                flexShrink: 0,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: entry.color, letterSpacing: '0.06em' }}>
                  {entry.name}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                  {entry.percentage}% of total
                </div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CfaSeverityChart;
