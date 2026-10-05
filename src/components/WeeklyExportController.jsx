import React, { useMemo, useRef, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, LabelList
} from 'recharts';
import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';
import { findKey, parseNumber, getWeekStart, getWeekLabel } from '../utils/dataUtils';

/* ─────────── helpers ─────────── */
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FACTORY_COLORS = ['#22c55e', '#f43f5e', '#FF6A00', '#60a5fa', '#facc15', '#a78bfa'];
const LABEL_DIR      = [
  { dx:  25, dy: -35 },
  { dx: -25, dy:  35 },
  { dx: -35, dy: -55 },
  { dx:  35, dy:  55 },
  { dx:  50, dy: -15 },
  { dx: -50, dy:  15 },
];

const fmtDate = (str) => {
  if (!str) return '';
  const p = String(str).split('-');
  return p.length === 3 ? `${parseInt(p[2])} ${MONTHS[parseInt(p[1])-1]}` : str;
};

const computeChartData = (data, rawData) => {
  if (!data || data.length === 0 || !rawData || rawData.length === 0)
    return { byDate: [], byFactory: [], factories: [] };

  const first      = rawData[0];
  const dateKey    = findKey(first, 'date');
  const factoryKey = findKey(first, 'factory');
  const poKey      = findKey(first, 'po') || 'po';
  const qtyInsKey  = findKey(first, 'qty_inspection', 'qty inspection') || 'qty_inspection';
  const aGradeKey  = findKey(first, 'total_a_grade', 'total a grade', 'a_grade', 'a grade', 'agrade', 'a-grade', 'grade_a', 'grade a') || 'a_grade';
  const bGradeKey  = findKey(first, 'avg b grade', 'avg_b_grade', 'b_grade') || 'b_grade';

  const defectKeys = [];
  for (let i = 1; i <= 25; i++) {
    const k = findKey(first, `qty_defect_${i}`, `qty defect ${i}`);
    if (k) defectKeys.push(k);
  }

  const factorySet = new Set();
  const dateFactoryMap = {};
  const factoryTotalsMap = {};

  data.forEach(item => {
    const rawDate   = item[dateKey] || '';
    const factory   = String(item[factoryKey] || 'Unknown').trim();
    const inspection = parseNumber(item[qtyInsKey]);
    const defects    = defectKeys.reduce((s,k) => s + parseNumber(item[k]), 0);
    const aGrade     = parseNumber(item[aGradeKey]);
    const bGrade     = parseNumber(item[bGradeKey]);
    const po         = String(item[poKey] || '').trim();

    factorySet.add(factory);

    if (!dateFactoryMap[rawDate]) dateFactoryMap[rawDate] = {};
    if (!dateFactoryMap[rawDate][factory])
      dateFactoryMap[rawDate][factory] = { inspection: 0, aGrade: 0, defects: 0 };
    dateFactoryMap[rawDate][factory].inspection += inspection;
    dateFactoryMap[rawDate][factory].aGrade     += aGrade;
    dateFactoryMap[rawDate][factory].defects    += defects;

    if (!factoryTotalsMap[factory])
      factoryTotalsMap[factory] = { inspection:0, defects:0, aGrade:0, bGrade:0, poSet: new Set() };
    factoryTotalsMap[factory].inspection += inspection;
    factoryTotalsMap[factory].defects    += defects;
    factoryTotalsMap[factory].aGrade     += aGrade;
    factoryTotalsMap[factory].bGrade     += bGrade;
    if (po && po !== '-') factoryTotalsMap[factory].poSet.add(po);
  });

  const factories = Array.from(factorySet).sort();

  const byDate = Object.entries(dateFactoryMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([rawDate, factoriesData]) => {
      const row = { name: fmtDate(rawDate) };
      let maxVal = -1;
      let minVal = 999;
      factories.forEach(f => {
        const fd = factoriesData[f];
        if (fd && fd.inspection > 0) {
          const val = Math.round((fd.aGrade / fd.inspection) * 1000) / 10;
          row[f] = val;
        } else {
          row[f] = null;
        }
      });
      return row;
    });

  const byFactory = Object.entries(factoryTotalsMap)
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([name, f]) => ({
      name,
      'Count PO Checking': f.poSet.size,
      'A Grade': f.aGrade,
      'B Grade': f.bGrade
    }));

  return { byDate, byFactory, factories };
};

/* ─────────── single week page (fixed size for capture) ─────────── */
const WeekPage = React.forwardRef(({ weekLabel, data, rawData, weekIndex, totalWeeks }, ref) => {
  const { byDate, byFactory, factories } = useMemo(
    () => computeChartData(data, rawData),
    [data, rawData]
  );

  return (
    <div
      ref={ref}
      style={{
        width: 1400,
        height: 850,
        background: '#0A0520',
        padding: '24px',
        boxSizing: 'border-box',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* Page Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                    borderBottom:'1px solid rgba(255,255,255,0.15)', paddingBottom:'12px' }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800, color:'#FF6A00', letterSpacing:2, textTransform:'uppercase' }}>
            PSI Weekly Summary
          </div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)', marginTop:2 }}>
            📅 {weekLabel}
          </div>
        </div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', textAlign:'right' }}>
          Page {weekIndex + 1} of {totalWeeks}<br />
          PSI Inspectors only
        </div>
      </div>

      {/* Charts Area */}
      <div style={{ display:'flex', flexDirection:'column', flex:1, gap:14 }}>

        {/* RFT Bar Chart */}
        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.12)',
                      padding:'12px', flex:1 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.6)',
                        textTransform:'uppercase', marginBottom:6 }}>
            📈 RFT by Date — per Factory
          </div>
          <BarChart width={1320} height={340} data={byDate}
                    margin={{ top:40, right:60, left:60, bottom:20 }} barCategoryGap="15%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="name" angle={-35} textAnchor="end" height={70}
                   tick={{ fill:'rgba(255,255,255,0.6)', fontSize:10 }} tickMargin={10}
                   padding={{ left:20, right:20 }} />
            <YAxis domain={[0,110]} ticks={[0,25,50,75,100]}
                   tick={{ fill:'rgba(255,255,255,0.6)', fontSize:10 }}
                   tickFormatter={v => `${v}%`} />
            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <Legend wrapperStyle={{ paddingTop:'10px', fontSize:10, color:'rgba(255,255,255,0.7)' }} />
            {factories.map((f, idx) => {
              const color = FACTORY_COLORS[idx % FACTORY_COLORS.length];
              return (
                <Bar
                  key={f}
                  dataKey={f}
                  fill={color}
                  radius={[3, 3, 0, 0]}
                >
                  <LabelList
                    dataKey={f}
                    position="top"
                    fill={color}
                    fontSize={10}
                    fontWeight="bold"
                    formatter={(val) => (val != null ? `${val}%` : '')}
                  />
                  <LabelList
                    dataKey={f}
                    position="center"
                    fill="rgba(255,255,255,0.9)"
                    fontSize={11}
                    fontWeight="bold"
                    formatter={(val) => (val != null ? f : '')}
                  />
                </Bar>
              );
            })}
          </BarChart>
        </div>

        {/* Factory Bar Chart */}
        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.12)',
                      padding:'12px' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.6)',
                        textTransform:'uppercase', marginBottom:2 }}>
            📊 Factory Statistics
          </div>
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', marginBottom:6 }}>
            Kiri: A Grade &nbsp;|&nbsp; Kanan: B Grade &amp; Count PO Checking
          </div>
          <BarChart width={1320} height={340} data={byFactory}
                    margin={{ top:10, right:60, left:10, bottom:5 }}
                    barCategoryGap="30%" barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill:'rgba(255,255,255,0.7)', fontSize:11 }} />
            <YAxis yAxisId="left"  orientation="left"  tick={{ fill:'#22c55e', fontSize:10 }}
                   tickFormatter={v => v.toLocaleString()}
                   label={{ value:'A Grade', angle:-90, position:'insideLeft', fill:'#22c55e', fontSize:9 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill:'#f43f5e', fontSize:10 }}
                   label={{ value:'B Grade / Count PO', angle:90, position:'insideRight', fill:'#f43f5e', fontSize:9, dx:10 }} />
            <Tooltip cursor={{ fill:'rgba(255,255,255,0.04)' }} />
            <Legend wrapperStyle={{ fontSize:10, color:'white', paddingTop:8 }} />
            <Bar yAxisId="left"  dataKey="A Grade"           fill="#22c55e" radius={[3,3,0,0]}>
              <LabelList dataKey="A Grade"           position="top" formatter={v => v.toLocaleString()} style={{ fill:'#22c55e', fontSize:9, fontWeight:'bold' }} />
            </Bar>
            <Bar yAxisId="right" dataKey="B Grade"           fill="#f43f5e" radius={[3,3,0,0]}>
              <LabelList dataKey="B Grade"           position="top" formatter={v => v.toLocaleString()} style={{ fill:'#f43f5e', fontSize:9, fontWeight:'bold' }} />
            </Bar>
            <Bar yAxisId="right" dataKey="Count PO Checking" fill="#FF6A00" radius={[3,3,0,0]}>
              <LabelList dataKey="Count PO Checking" position="top" formatter={v => String(v)} style={{ fill:'#FF6A00', fontSize:9, fontWeight:'bold' }} />
            </Bar>
          </BarChart>
        </div>
      </div>
    </div>
  );
});

WeekPage.displayName = 'WeekPage';

/* ─────────── controller ─────────── */
const WeeklyExportController = ({ psiData, rawData, onDone, onProgress }) => {
  const weekRefs = useRef([]);

  const weeklyGroups = useMemo(() => {
    if (!psiData || psiData.length === 0 || !rawData || rawData.length === 0) return [];

    const first   = rawData[0];
    const dateKey = findKey(first, 'date');
    const weekMap = {};

    psiData.forEach(item => {
      const dateStr   = item[dateKey] || '';
      const weekStart = getWeekStart(dateStr);
      if (!weekStart) return;
      if (!weekMap[weekStart]) weekMap[weekStart] = [];
      weekMap[weekStart].push(item);
    });

    return Object.entries(weekMap)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([weekStart, data]) => ({ weekStart, data, label: getWeekLabel(weekStart) }));
  }, [psiData, rawData]);

  useEffect(() => {
    if (weeklyGroups.length === 0) { onDone(); return; }

    const runExport = async () => {
      const pdf = new jsPDF({ orientation:'landscape', unit:'px', format:[1400, 850] });

      for (let i = 0; i < weeklyGroups.length; i++) {
        if (onProgress) onProgress(i + 1, weeklyGroups.length);

        const el = weekRefs.current[i];
        if (!el) continue;

        if (i > 0) pdf.addPage([1400, 850], 'landscape');

        try {
          const dataUrl = await toJpeg(el, {
            backgroundColor: '#0A0520',
            width: 1400,
            height: 850,
            pixelRatio: 1.5,
            quality: 0.92
          });
          pdf.addImage(dataUrl, 'JPEG', 0, 0, 1400, 850);
        } catch (err) {
          console.error(`Failed to capture week ${i}:`, err);
        }
      }

      pdf.save('PSI_Weekly_Summary.pdf');
      onDone();
    };

    const timer = setTimeout(runExport, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeklyGroups]);

  return (
    <div style={{ position:'fixed', left:'-9999px', top:0, zIndex:-1, pointerEvents:'none' }}>
      {weeklyGroups.map(({ weekStart, data, label }, i) => (
        <WeekPage
          key={weekStart}
          ref={el => { weekRefs.current[i] = el; }}
          weekLabel={label}
          data={data}
          rawData={rawData}
          weekIndex={i}
          totalWeeks={weeklyGroups.length}
        />
      ))}
    </div>
  );
};

export default WeeklyExportController;
