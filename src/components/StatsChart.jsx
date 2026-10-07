import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LabelList, Cell
} from 'recharts';
import { findKey, parseNumber, parsePercent, toLocalISODate } from '../utils/dataUtils';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const displayLabel = String(label).replace('\n', ', ');
    return (
      <div style={{
        background: '#1A0F5A',
        border: '1px solid rgba(255,255,255,0.2)',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '12px'
      }}>
        <p style={{ fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>{displayLabel}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color, margin: '2px 0' }}>
            {entry.name}: {Number(entry.value).toFixed(1)}%
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CustomXAxisTick = (props) => {
  const { x, y, payload } = props;
  if (!payload || !payload.value) return null;
  const parts = String(payload.value).split('\n');
  const dateStr = parts[0] || '';
  const dayStr = parts[1] || '';

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize={9} fontWeight="bold">
        <tspan x={0} dy={9}>{dateStr}</tspan>
        <tspan x={0} dy={11} fill="rgba(255,255,255,0.4)" fontSize={8} fontWeight="normal">{dayStr}</tspan>
      </text>
    </g>
  );
};

const StatsChart = ({ data = [], rawData = [], activeTab }) => {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[200px] flex items-center justify-center text-white/40 text-xs">
        NO DATA FOR CHART
      </div>
    );
  }

  const firstItem = rawData[0] || {};
  const dateKey = findKey(firstItem, 'date');
  const qtyInsKey = findKey(firstItem, 'qty_inspection', 'qty inspection') || 'qty_inspection';
  const aGradeKey = findKey(firstItem, 'total_a_grade', 'total a grade', 'a_grade', 'a grade', 'agrade', 'a-grade', 'grade_a', 'grade a') || 'a_grade';
  const rftKey = findKey(firstItem, 'rft');

  // Group by date
  const groups = {};
  data.forEach(item => {
    if (!dateKey) return;
    const dateStr = item[dateKey];
    if (!dateStr) return;

    let dateObj;
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/').map(Number);
      dateObj = new Date(year, month - 1, day);
    } else {
      dateObj = new Date(dateStr);
    }

    if (isNaN(dateObj.getTime())) return;
    const isoStr = toLocalISODate(dateObj);

    if (!groups[isoStr]) {
      groups[isoStr] = { dateObj, qtyInspection: 0, aGrade: 0, rftSum: 0, rftCount: 0 };
    }

    groups[isoStr].qtyInspection += parseNumber(item[qtyInsKey]);
    groups[isoStr].aGrade += parseNumber(item[aGradeKey]);

    if (rftKey) {
      const val = parsePercent(item[rftKey]);
      if (val !== null) {
        const rftWeight = activeTab === 'T1QM' ? parseNumber(item[qtyInsKey]) : 1;
        if (rftWeight > 0) {
          groups[isoStr].rftSum += val * rftWeight;
          groups[isoStr].rftCount += rftWeight;
        }
      }
    }
  });

  const chartData = Object.values(groups)
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
    .map(g => {
      const rft = g.rftCount > 0
        ? parseFloat((g.rftSum / g.rftCount).toFixed(1))
        : (g.qtyInspection > 0
          ? parseFloat(((g.aGrade / g.qtyInspection) * 100).toFixed(1))
          : 0);

      const daysEng = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = daysEng[g.dateObj.getDay()];
      const d = String(g.dateObj.getDate()).padStart(2, '0');
      const m = String(g.dateObj.getMonth() + 1).padStart(2, '0');
      const y = g.dateObj.getFullYear();

      return {
        name: `${d}/${m}/${y}\n${dayName}`,
        RFT: rft,
        // Color by performance
        fill: rft >= 80 ? '#4ADE80' : rft >= 60 ? '#FACC15' : '#F87171'
      };
    });

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 px-1 border-b border-white/20 pb-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-white/90 whitespace-nowrap">
          📊 RFT by Date
        </span>
        <div className="flex items-center gap-1.5 text-[9px] font-bold whitespace-nowrap">
          <span className="flex items-center gap-0.5 text-[#4ADE80]">■ ≥80%</span>
          <span className="flex items-center gap-0.5 text-[#FACC15]">■ ≥60%</span>
          <span className="flex items-center gap-0.5 text-[#F87171]">■ &lt;60%</span>
        </div>
      </div>
      <div style={{ height: 200, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 25, right: 10, left: 8, bottom: 5 }} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={<CustomXAxisTick />}
              height={40}
              interval={activeTab === 'T1QM' ? Math.max(0, Math.ceil(chartData.length / 5) - 1) : 0}
            />
            <YAxis
              domain={[0, 110]}
              ticks={[0, 25, 50, 75, 100]}
              width={38}
              tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 9.5, fontWeight: 'bold' }}
              tickFormatter={v => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="RFT" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.85} />
              ))}
              <LabelList
                dataKey="RFT"
                position="top"
                fill="#FFFFFF"
                fontSize={10}
                fontWeight="bold"
                formatter={v => v != null ? `${Number(v).toFixed(1)}%` : ''}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StatsChart;
