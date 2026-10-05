import React, { useMemo } from 'react';
import Header from './Header';
import BuildingStatusTable from './BuildingStatusTable';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';
import { findKey, parseNumber } from '../utils/dataUtils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const FACTORY_COLORS = ['#22c55e', '#f43f5e', '#FF6A00', '#60a5fa', '#facc15', '#a78bfa'];

// Each factory gets a unique diagonal direction and length (dx, dy) 
// We use strict quadrants to ensure they route into completely opposite spaces
const LABEL_DIR = [
  { dx: 25, dy: -35 }, // F1: Top-Right (medium)
  { dx: -25, dy: 35 }, // F2: Bottom-Left (medium)
  { dx: -35, dy: -55 }, // F3: Top-Left (high)
  { dx: 35, dy: 55 }, // F4: Bottom-Right (low)
  { dx: 50, dy: -15 }, // F5: Far-Right-Top (shallow)
  { dx: -50, dy: 15 }, // F6: Far-Left-Bottom (shallow)
];

const formatDateLabel = (dateStr) => {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]}`;
  }
  return dateStr;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#1A0F5A',
        border: '1px solid rgba(255,255,255,0.2)',
        padding: '10px 14px',
        borderRadius: '6px',
        minWidth: '160px'
      }}>
        <p style={{ fontWeight: 'bold', color: 'white', marginBottom: '6px', fontSize: '12px' }}>{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color, fontSize: '11px', margin: '2px 0' }}>
            {entry.name}: {
              String(entry.name).includes('Grade') || String(entry.name).includes('Checking')
                ? Number(entry.value).toLocaleString()
                : `${Number(entry.value).toFixed(1)}%`
            }
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const SummaryView = ({ data, rawData, headerMetadata }) => {
  const { byDateMultiLine, factories, byFactory } = useMemo(() => {
    if (!data || data.length === 0 || !rawData || rawData.length === 0) {
      return { byDateMultiLine: [], factories: [], byFactory: [] };
    }

    const firstItem = rawData[0];
    const dateKey = findKey(firstItem, 'date');
    const factoryKey = findKey(firstItem, 'factory');
    const poKey = findKey(firstItem, 'po') || 'po';
    const qtyInsKey = findKey(firstItem, 'qty_inspection', 'qty inspection') || 'qty_inspection';
    const aGradeKey = findKey(firstItem, 'total_a_grade', 'total a grade', 'a_grade', 'a grade', 'agrade', 'a-grade', 'grade_a', 'grade a') || 'a_grade';
    const bGradeKey = findKey(firstItem, 'avg b grade', 'avg_b_grade', 'b_grade') || 'b_grade';

    // Pre-find defect qty keys
    const defectQtyKeys = [];
    for (let i = 1; i <= 25; i++) {
      const k = findKey(firstItem, `qty_defect_${i}`, `qty defect ${i}`);
      if (k) defectQtyKeys.push(k);
    }

    // Collect unique factories and unique dates
    const factorySet = new Set();
    const dateSet = new Set();

    data.forEach(item => {
      const f = String(item[factoryKey] || 'Unknown').trim();
      const d = item[dateKey] || '';
      factorySet.add(f);
      dateSet.add(d);
    });

    const factories = Array.from(factorySet).sort();

    // Build map: dateRaw → { factory → { inspection, defects, aGrade, bGrade } }
    const dateFactoryMap = {};

    // Build factory totals map with Set for unique POs
    const factoryTotalsMap = {};

    data.forEach(item => {
      const factory = String(item[factoryKey] || 'Unknown').trim();
      const inspection = parseNumber(item[qtyInsKey]);
      const defects = defectQtyKeys.reduce((sum, k) => sum + parseNumber(item[k]), 0);
      const aGrade = parseNumber(item[aGradeKey]);
      const bGrade = parseNumber(item[bGradeKey]);
      const po = String(item[poKey] || '').trim();

      if (!dateFactoryMap[item[dateKey] || '']) dateFactoryMap[item[dateKey] || ''] = {};
      const rawDate = item[dateKey] || '';
      if (!dateFactoryMap[rawDate]) dateFactoryMap[rawDate] = {};
      if (!dateFactoryMap[rawDate][factory]) {
        dateFactoryMap[rawDate][factory] = { inspection: 0, aGrade: 0, defects: 0 };
      }
      dateFactoryMap[rawDate][factory].inspection += inspection;
      dateFactoryMap[rawDate][factory].aGrade += aGrade;
      dateFactoryMap[rawDate][factory].defects += defects;

      if (!factoryTotalsMap[factory]) {
        factoryTotalsMap[factory] = { inspection: 0, defects: 0, aGrade: 0, bGrade: 0, poSet: new Set() };
      }
      factoryTotalsMap[factory].inspection += inspection;
      factoryTotalsMap[factory].defects += defects;
      factoryTotalsMap[factory].aGrade += aGrade;
      factoryTotalsMap[factory].bGrade += bGrade;
      if (po && po !== '-') factoryTotalsMap[factory].poSet.add(po);
    });

    // RFT by Date (multi-line, one per factory)
    const byDateMultiLine = Object.entries(dateFactoryMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([rawDate, factoriesData]) => {
        const row = { name: formatDateLabel(rawDate) };
        factories.forEach(f => {
          const fd = factoriesData[f];
          if (fd && fd.inspection > 0) {
            row[f] = Math.round((fd.aGrade / fd.inspection) * 1000) / 10;
          } else {
            row[f] = null;
          }
        });
        return row;
      });

    const byFactory = Object.entries(factoryTotalsMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, f]) => ({
        name,
        'Count PO Checking': f.poSet.size,
        'A Grade': f.aGrade,
        'B Grade': f.bGrade
      }));

    return { byDateMultiLine, factories, byFactory };
  }, [data, rawData]);

  const isEmpty = !data || data.length === 0;

  return (
    <div id="summary-canvas" className="industrial-border bg-primary p-4 relative w-full rounded-sm">
      <Header data={headerMetadata || {}} />

      <div className="flex flex-col gap-5 mt-4">

        {isEmpty ? (
          <div className="flex-1 flex items-center justify-center text-white/40 text-lg">
            No data available for the current filters.
          </div>
        ) : (
          <>
            {/* Full-Width RFT by Date (multi-line per factory) */}
            <div className="industrial-border bg-white/5 p-4 flex flex-col w-full" style={{ height: '300px' }}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/70 mb-3">
                📈 RFT by Date — per Factory
              </h3>
              <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byDateMultiLine} margin={{ top: 40, right: 60, left: 60, bottom: 20 }} barCategoryGap="15%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      angle={-35}
                      textAnchor="end"
                      tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
                      tickMargin={10}
                      height={70}
                    />
                    <YAxis
                      domain={[0, 110]}
                      ticks={[0, 25, 50, 75, 100]}
                      tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
                      tickFormatter={v => `${v}%`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }} />
                    {factories.map((factory, idx) => {
                      const color = FACTORY_COLORS[idx % FACTORY_COLORS.length];
                      return (
                        <Bar
                          key={factory}
                          dataKey={factory}
                          fill={color}
                          radius={[3, 3, 0, 0]}
                          isAnimationActive={false}
                        >
                          <LabelList
                            dataKey={factory}
                            position="top"
                            fill={color}
                            fontSize={10}
                            fontWeight="bold"
                            formatter={(val) => (val != null ? `${val}%` : '')}
                          />
                          <LabelList
                            dataKey={factory}
                            position="center"
                            fill="rgba(255,255,255,0.9)"
                            fontSize={11}
                            fontWeight="bold"
                            formatter={(val) => (val != null ? factory : '')}
                          />
                        </Bar>
                      );
                    })}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart: Factory Statistics */}
            <div className="industrial-border bg-white/5 p-4 flex flex-col w-full" style={{ height: '280px' }}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                📊 Factory Statistics — Count PO Checking / A Grade / B Grade
              </h3>
              <div className="flex gap-4 text-[10px] text-white/40 mb-2">
                <span>Kiri: A Grade</span>
                <span>Kanan: B Grade &amp; Count PO Checking</span>
              </div>
              <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={byFactory}
                    margin={{ top: 10, right: 60, left: 10, bottom: 5 }}
                    barCategoryGap="25%"
                    barGap={4}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }} />
                    {/* Left Y-axis: A Grade (large values) */}
                    <YAxis
                      yAxisId="left"
                      orientation="left"
                      tick={{ fill: '#22c55e', fontSize: 10 }}
                      tickFormatter={v => v.toLocaleString()}
                      label={{ value: 'A Grade', angle: -90, position: 'insideLeft', fill: '#22c55e', fontSize: 10, dx: -5 }}
                    />
                    {/* Right Y-axis: B Grade & Count PO (small values) */}
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: '#f43f5e', fontSize: 10 }}
                      label={{ value: 'B Grade / Count PO', angle: 90, position: 'insideRight', fill: '#f43f5e', fontSize: 10, dx: 10 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '12px', color: 'white' }} />
                    <Bar yAxisId="left" dataKey="A Grade" fill="#22c55e" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                      <LabelList dataKey="A Grade" position="top" formatter={v => v.toLocaleString()} style={{ fill: '#22c55e', fontSize: 10, fontWeight: 'bold' }} />
                    </Bar>
                    <Bar yAxisId="right" dataKey="B Grade" fill="#f43f5e" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                      <LabelList dataKey="B Grade" position="top" formatter={v => v.toLocaleString()} style={{ fill: '#f43f5e', fontSize: 10, fontWeight: 'bold' }} />
                    </Bar>
                    <Bar yAxisId="right" dataKey="Count PO Checking" fill="#FF6A00" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                      <LabelList dataKey="Count PO Checking" position="top" formatter={v => v.toLocaleString()} style={{ fill: '#FF6A00', fontSize: 10, fontWeight: 'bold' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Building Status Table — Hidden for PSI */}
            {headerMetadata?.inspectorType !== 'PSI LV.2' && (
              <div className="w-full">
                <BuildingStatusTable data={data} rawData={rawData} activeTab={headerMetadata?.inspectorType} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SummaryView;
