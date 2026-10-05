import React, { useMemo } from 'react';
import {
  BarChart, Bar, Line, ComposedChart, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, LabelList
} from 'recharts';
import { findKey, parseNumber, parsePercent, formatDateStr } from '../utils/dataUtils';

/* ─── Helpers ─── */
const formatNumberIndo = (num) => {
  if (num === null || num === undefined || num === '-') return '-';
  const val = Number(num);
  if (isNaN(val)) return '-';
  return val.toLocaleString('id-ID');
};

const formatPercentIndo = (num) => {
  if (num === null || num === undefined) return '0,0%';
  const val = parseFloat(num);
  if (isNaN(val)) return '0,0%';
  return val.toLocaleString('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }) + '%';
};

const formatEmailDate = (dateStr) => {
  if (!dateStr || dateStr === 'ALL') return '-';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  if (String(dateStr).includes('/')) {
    const [d, m, y] = String(dateStr).split('/').map(Number);
    return `${d} ${months[m - 1] || 'Jan'} ${y}`;
  }
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${parseInt(d)} ${months[parseInt(m) - 1] || 'Jan'} ${y}`;
  }
  return dateStr;
};

// ANSI AQL Limits
const AQL_CHECKING_STEPS = [3, 5, 8, 13, 20, 32, 50, 80, 125, 200];
const AQL_MINOR_LIMITS   = [1, 1, 1,  2,  2,  3,  4,  6,   8,  11];
const AQL_MAJOR_LIMITS   = [1, 1, 1,  1,  2,  2,  3,  4,   6,   8];

const getAqlLimits = (qtyChecking) => {
  const qty = Number(qtyChecking);
  if (!qty || isNaN(qty) || qty <= 0) return { minor: '-', major: '-', critical: 0 };
  let idx = AQL_CHECKING_STEPS.findIndex(step => step >= qty);
  if (idx === -1) idx = AQL_CHECKING_STEPS.length - 1;
  return {
    minor:    AQL_MINOR_LIMITS[idx],
    major:    AQL_MAJOR_LIMITS[idx],
    critical: 0,
  };
};

const formatDefectLabel = (text, maxCharsPerLine = 18) => {
  if (!text) return [''];
  const val = String(text).trim();
  if (val.length <= maxCharsPerLine) return [val];

  const words = val.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + (currentLine ? ' ' : '') + word).length <= maxCharsPerLine) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) lines.push(currentLine);

  if (lines.length > 2) {
    const l1 = lines[0];
    const l2 = lines.slice(1).join(' ');
    if (l2.length > maxCharsPerLine + 2) {
      return [l1, l2.substring(0, maxCharsPerLine) + '…'];
    }
    return [l1, l2];
  }

  return lines;
};

const CustomYAxisTick = ({ x, y, payload }) => {
  if (!payload || !payload.value) return null;
  const lines = formatDefectLabel(payload.value, 20);
  const fontSize = 8.5;

  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, index) => {
        const totalLines = lines.length;
        const dy = (index - (totalLines - 1) / 2) * (fontSize + 2);
        return (
          <text
            key={index}
            x={-4}
            y={dy}
            dy="0.32em"
            textAnchor="end"
            fill="#1e293b"
            fontSize={fontSize}
            fontWeight="bold"
          >
            {line}
          </text>
        );
      })}
    </g>
  );
};

/**
 * Compute 3rd Party KPI Stats
 */
export const compute3rdPartyStats = (data, rawData) => {
  if (!data || data.length === 0) {
    return {
      qtyOrder: 0,
      qtyChecking: 0,
      totalAGrade: 0,
      totalBGrade: 0,
      totalDefects: 0,
      minorDefect: 0,
      majorDefect: 0,
      criticalDefect: 0,
      pass: 0,
      fail: 0,
      passRate: '0.0'
    };
  }

  const firstItem = rawData[0] || {};
  const qtyInsKey = findKey(firstItem, 'qty_inspection', 'qty inspection');
  const poKey = findKey(firstItem, 'po');
  const qtyOrderKey = findKey(firstItem, 'qty_order', 'qty order');
  const totalDefectKey = findKey(firstItem, 'total_defect', 'total defect', 'qty_defect', 'qty defect');
  const aGradeKey = findKey(firstItem, 'a_grade', 'a grade', 'agrade');
  const bGradeKey = findKey(firstItem, 'b_grade', 'b grade', 'bgrade', 'avg_b_grade', 'avg b grade');
  const totalAGradeKey = findKey(firstItem, 'total_a_grade', 'total a grade', 'a_grade', 'a grade', 'agrade');
  const statusKey = findKey(firstItem, 'status_po', 'status po', 'status_inspection', 'status inspection', 'status', 'result', 'pass_fail');

  const qtyDefectKeys = [];
  const classificationKeys = [];
  for (let i = 1; i <= 25; i++) {
    qtyDefectKeys[i] = findKey(firstItem, `qty_defect_${i}`, `qty defect ${i}`, `qtydefect${i}`);
    classificationKeys[i] = findKey(firstItem, `classification_${i}`, `classification ${i}`, `clasification_${i}`, `clasification ${i}`);
  }

  let totalInspection = 0;
  let totalDefects = 0;
  let totalAGrade = 0;
  let totalBGrade = 0;
  let totalAGradeFull = 0;
  let totalCritical = 0;
  let totalMajor = 0;
  let totalMinor = 0;
  let totalPass = 0;
  let totalFail = 0;

  data.forEach(item => {
    totalInspection += parseNumber(item[qtyInsKey]);
    totalAGrade += parseNumber(item[aGradeKey]);
    totalBGrade += parseNumber(item[bGradeKey]);
    totalAGradeFull += parseNumber(item[totalAGradeKey]);

    for (let i = 1; i <= 25; i++) {
      if (!qtyDefectKeys[i] && !classificationKeys[i]) continue;
      const qty = parseNumber(item[qtyDefectKeys[i]]);
      const cls = classificationKeys[i] ? String(item[classificationKeys[i]] || '').trim().toUpperCase() : '';
      if (qty <= 0) continue;
      if (cls.includes('CRITICAL')) totalCritical += qty;
      else if (cls.includes('MAJOR')) totalMajor += qty;
      else if (cls.includes('MINOR')) totalMinor += qty;
    }

    if (totalDefectKey) {
      totalDefects += parseNumber(item[totalDefectKey]);
    } else {
      for (let i = 1; i <= 25; i++) {
        if (qtyDefectKeys[i]) totalDefects += parseNumber(item[qtyDefectKeys[i]]);
      }
    }

    if (statusKey && item[statusKey] !== undefined && item[statusKey] !== null && item[statusKey] !== '') {
      const s = String(item[statusKey]).trim().toUpperCase();
      if (s.includes('FAIL') || s.includes('REJECT') || s === 'F') {
        totalFail++;
      } else if (s.includes('PASS') || s.includes('APPROV') || s === 'P') {
        totalPass++;
      }
    }
  });

  // QTY ORDER (sum unique PO orders)
  const poOrders = {};
  let hasPO = false;
  let maxFallbackOrder = 0;
  data.forEach(item => {
    const po = item[poKey];
    const orderVal = parseNumber(item[qtyOrderKey]);
    if (po && String(po).trim() !== '-' && String(po).trim() !== '') {
      hasPO = true;
      if (!poOrders[po] || orderVal > poOrders[po]) poOrders[po] = orderVal;
    } else {
      if (orderVal > maxFallbackOrder) maxFallbackOrder = orderVal;
    }
  });
  const totalQtyOrder = hasPO
    ? Object.values(poOrders).reduce((s, v) => s + v, 0)
    : maxFallbackOrder;

  const evaluated = totalPass + totalFail;
  const passRateVal = evaluated > 0
    ? ((totalPass / evaluated) * 100)
    : (totalInspection > 0 ? (((totalInspection - totalDefects) / totalInspection) * 100) : 100);

  const passRate = passRateVal > 0 ? passRateVal.toFixed(1) : '0.0';

  return {
    qtyOrder: totalQtyOrder,
    qtyChecking: totalInspection,
    totalAGrade: totalAGradeFull || totalAGrade,
    totalBGrade: totalBGrade,
    totalDefects,
    minorDefect: totalMinor,
    majorDefect: totalMajor,
    criticalDefect: totalCritical,
    pass: totalPass,
    fail: totalFail,
    passRate
  };
};

/**
 * Compute Top 5 defect stats
 */
export const computeTopDefects = (data, rawData) => {
  if (!data || data.length === 0) return [];
  const firstItem = rawData[0] || {};
  const nameKeys = [];
  const qtyKeys = [];
  const imageUrlKeyGroups = [];

  for (let i = 1; i <= 25; i++) {
    nameKeys[i] = findKey(firstItem, `defect_name_${i}`, `defect name ${i}`, `defectname${i}`);
    qtyKeys[i] = findKey(firstItem, `qty_defect_${i}`, `qty defect ${i}`, `qtydefect${i}`);

    const imageSlotStart = ((i - 1) * 3) + 1;
    imageUrlKeyGroups[i] = [0, 1, 2]
      .map(offset => findKey(firstItem, `link${imageSlotStart + offset}`, `photo${imageSlotStart + offset}`))
      .filter(Boolean);
  }

  const counts = {};
  const imageSelections = {};

  data.forEach((item, rowIndex) => {
    for (let i = 1; i <= 25; i++) {
      const nameKey = nameKeys[i];
      const qtyKey = qtyKeys[i];
      const imageUrlKeys = imageUrlKeyGroups[i] || [];

      if (!nameKey || !qtyKey) continue;
      const name = item[nameKey];
      const qty = parseNumber(item[qtyKey]);
      const url = imageUrlKeys.map(k => item[k]).find(v => v && v !== '-');

      if (name && name !== '-' && name !== 'NO DATA' && qty > 0) {
        const norm = name.trim();
        counts[norm] = (counts[norm] || 0) + qty;
        if (url && url !== '-') {
          const current = imageSelections[norm];
          if (!current || qty > current.qty || (qty === current.qty && rowIndex > current.rowIndex)) {
            imageSelections[norm] = { url, qty, rowIndex };
          }
        }
      }
    }
  });

  return Object.entries(counts)
    .map(([name, value]) => ({ name, value, url: imageSelections[name]?.url || null }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
};

/**
 * Compute Building Status Chart Data (Pass, Fail, Total, PassRate)
 */
export const computeBuildingStatusData = (data, rawData) => {
  if (!data || data.length === 0 || !rawData || rawData.length === 0) return [];
  const firstItem = rawData[0] || {};
  const factoryKey = findKey(firstItem, 'factory', 'building') || 'factory';
  const statusKey = findKey(firstItem, 'status_po', 'status po', 'status_inspection', 'status inspection', 'status', 'result', 'pass_fail');

  const buildingMap = {};
  data.forEach(item => {
    let rawBuilding = String(item[factoryKey] || 'Unknown').trim();
    if (!rawBuilding || rawBuilding === '-') rawBuilding = 'Unknown';
    if (!buildingMap[rawBuilding]) {
      buildingMap[rawBuilding] = { totalInspection: 0, pass: 0, fail: 0 };
    }
    buildingMap[rawBuilding].totalInspection += 1;
    if (statusKey && item[statusKey] !== undefined && item[statusKey] !== null && item[statusKey] !== '') {
      const s = String(item[statusKey]).trim().toUpperCase();
      if (s.includes('FAIL') || s.includes('REJECT') || s === 'F') {
        buildingMap[rawBuilding].fail += 1;
      } else if (s.includes('PASS') || s.includes('APPROV') || s === 'P') {
        buildingMap[rawBuilding].pass += 1;
      }
    }
  });

  return Object.entries(buildingMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([building, stats]) => {
      const evaluated = stats.pass + stats.fail;
      const passRate = evaluated > 0 ? parseFloat(((stats.pass / evaluated) * 100).toFixed(1)) : 100;
      let displayName = building;
      if (/^F\d+/i.test(building)) displayName = building.toUpperCase().replace(/^F/, 'F ');
      return {
        name: displayName,
        pass: stats.pass,
        fail: stats.fail,
        totalInspection: stats.totalInspection,
        passRate
      };
    });
};

/* ─── Horizontal Defect Chart ─── */
const EmailDefectChart = ({ data, height = 225 }) => {
  const maxVal = data.length > 0 ? Math.max(...data.map(d => d.value), 0) : 0;
  let xMax = 60;
  if (maxVal > 0) {
    if (maxVal <= 5) xMax = 6;
    else if (maxVal <= 10) xMax = 12;
    else xMax = Math.ceil(maxVal * 1.15);
  }

  return (
    <div style={{ width: '100%', height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 35, left: 8, bottom: 2 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, xMax]}
            tick={{ fill: '#64748b', fontSize: 9 }}
            tickLine={false}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={<CustomYAxisTick />}
            width={125}
            interval={0}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={false}
          />
          <Bar dataKey="value" fill="#f97316" radius={[0, 3, 3, 0]} isAnimationActive={false} barSize={17}>
            <LabelList
              dataKey="value"
              position="right"
              fill="#0f172a"
              fontSize={10}
              fontWeight="bold"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ─── Building Status Composed Chart ─── */
const EmailBuildingStatusChart = ({ data, height = 160 }) => {
  return (
    <div style={{ width: '100%', height: `${height}px` }}>
      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '6px', fontSize: '9px', fontWeight: 800 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a' }}>
          <span style={{ width: '9px', height: '9px', backgroundColor: '#16a34a', borderRadius: '1px' }} />
          <span>PASS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626' }}>
          <span style={{ width: '9px', height: '9px', backgroundColor: '#dc2626', borderRadius: '1px' }} />
          <span>FAIL</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#2563eb' }}>
          <span style={{ width: '9px', height: '9px', backgroundColor: '#2563eb', borderRadius: '1px' }} />
          <span>TOTAL INSP</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ea580c' }}>
          <span style={{ width: '14px', height: '3px', backgroundColor: '#ea580c' }} />
          <span>PASS RATE</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height - 22}>
        <ComposedChart data={data} margin={{ top: 14, right: 28, left: 2, bottom: 2 }} barGap={3} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#334155', fontSize: 9, fontWeight: 'bold' }}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={false}
          />
          <YAxis
            yAxisId="count"
            orientation="left"
            tick={{ fill: '#64748b', fontSize: 8.5 }}
            axisLine={false}
            tickLine={false}
            width={28}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="rate"
            orientation="right"
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            tickFormatter={v => `${v}%`}
            tick={{ fill: '#64748b', fontSize: 8.5 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Bar yAxisId="count" dataKey="pass" fill="#16a34a" radius={[2, 2, 0, 0]} isAnimationActive={false} barSize={14}>
            <LabelList dataKey="pass" position="top" fill="#16a34a" fontSize={9} fontWeight="bold" formatter={v => (v > 0 ? v : '')} />
          </Bar>
          <Bar yAxisId="count" dataKey="fail" fill="#dc2626" radius={[2, 2, 0, 0]} isAnimationActive={false} barSize={14}>
            <LabelList dataKey="fail" position="top" fill="#dc2626" fontSize={9} fontWeight="bold" formatter={v => (v > 0 ? v : '')} />
          </Bar>
          <Bar yAxisId="count" dataKey="totalInspection" fill="#2563eb" radius={[2, 2, 0, 0]} isAnimationActive={false} barSize={14}>
            <LabelList dataKey="totalInspection" position="top" fill="#2563eb" fontSize={9} fontWeight="bold" formatter={v => (v > 0 ? v : '')} />
          </Bar>
          <Line
            yAxisId="rate"
            type="monotone"
            dataKey="passRate"
            stroke="#ea580c"
            strokeWidth={1.8}
            strokeDasharray="3 2"
            dot={{ fill: '#ea580c', r: 3.5 }}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="passRate"
              position="top"
              fill="#ea580c"
              fontSize={9}
              fontWeight="bold"
              formatter={v => (v != null ? `${v}%` : '')}
            />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ─── Main AqlEmailExportView Component ─── */
const AqlEmailExportView = ({
  aqlData = [],
  rawData = [],
  filters = {},
  prefetchedImagesMap = {}
}) => {
  const firstItem = rawData[0] || {};
  const factoryKey = findKey(firstItem, 'factory', 'building') || 'factory';
  const modelKey = findKey(firstItem, 'model') || 'model';
  const poKey = findKey(firstItem, 'po') || 'po';
  const crdKey = findKey(firstItem, 'crd') || 'crd';
  const cellKey = findKey(firstItem, 'cell', 'line') || 'cell';
  const articleKey = findKey(firstItem, 'article') || 'article';
  const destinationKey = findKey(firstItem, 'destination', 'destinasi') || 'destination';
  const dateKey = findKey(firstItem, 'date') || 'date';

  // 1. Get list of unique factories
  const factories = useMemo(() => {
    const set = new Set();
    aqlData.forEach(item => {
      const f = String(item[factoryKey] || '').trim();
      if (f && f !== '-') set.add(f);
    });
    return Array.from(set).sort();
  }, [aqlData, factoryKey]);

  // 2. Compute Overall Data
  const overallStats = useMemo(() => compute3rdPartyStats(aqlData, rawData), [aqlData, rawData]);
  const overallLimits = useMemo(() => getAqlLimits(overallStats.qtyChecking), [overallStats.qtyChecking]);
  const overallTopDefects = useMemo(() => computeTopDefects(aqlData, rawData), [aqlData, rawData]);
  const overallBuildingChartData = useMemo(() => computeBuildingStatusData(aqlData, rawData), [aqlData, rawData]);

  // Overall Factory List Text
  const factoryListString = useMemo(() => {
    return factories.map(f => {
      if (/^F\d+/i.test(f)) return f.toUpperCase().replace(/^F/, 'F ');
      if (/^FACTORY\s*\d+/i.test(f)) return f.replace(/^FACTORY\s*/i, 'F ');
      return f;
    }).join(', ');
  }, [factories]);

  // 3. Compute Per-Factory Data
  const factoryDataList = useMemo(() => {
    return factories.map(f => {
      const fData = aqlData.filter(item => String(item[factoryKey] || '').trim() === f);
      const stats = compute3rdPartyStats(fData, rawData);
      const limits = getAqlLimits(stats.qtyChecking);
      const topDefects = computeTopDefects(fData, rawData);
      const buildingChartData = computeBuildingStatusData(fData, rawData);

      // Metadata
      const pos = Array.from(new Set(fData.map(i => i[poKey]).filter(v => v && v !== '-'))).join(', ');
      const models = Array.from(new Set(fData.map(i => i[modelKey]).filter(v => v && v !== '-'))).join(', ');
      const crds = Array.from(new Set(fData.map(i => i[crdKey]).filter(v => v && v !== '-'))).join(', ');
      const destinations = Array.from(new Set(fData.map(i => i[destinationKey]).filter(v => v && v !== '-'))).join(', ');
      const articles = Array.from(new Set(fData.map(i => i[articleKey]).filter(v => v && v !== '-'))).join(', ');
      const cells = Array.from(new Set(fData.map(i => i[cellKey]).filter(v => v && v !== '-'))).join(', ');
      const dates = Array.from(new Set(fData.map(i => i[dateKey]).filter(v => v && v !== '-')));
      const dateDisplay = dates.length > 0
        ? (dates.length === 1 ? formatEmailDate(dates[0]) : `${formatEmailDate(dates[0])} - ${formatEmailDate(dates[dates.length - 1])}`)
        : formatEmailDate(filters.startDate);

      const images = (prefetchedImagesMap[f] && prefetchedImagesMap[f].length > 0)
        ? prefetchedImagesMap[f]
        : topDefects.map(d => ({ name: d.name, url: d.url ? d.url.replace('https://www.appsheet.com', '/appsheet-img') : null }));

      let factoryBadgeTitle = f.toUpperCase();
      if (/^F\d+/i.test(f)) {
        factoryBadgeTitle = f.toUpperCase().replace(/^F/, 'FACTORY ');
      }

      let factoryDisplayBox = f.toUpperCase();
      if (/^F\d+/i.test(f)) {
        factoryDisplayBox = f.toUpperCase().replace(/^F/, 'F ');
      }

      return {
        factory: f,
        factoryBadgeTitle,
        factoryDisplayBox,
        data: fData,
        stats,
        limits,
        topDefects,
        buildingChartData,
        images,
        meta: {
          po: pos || '-',
          model: models || '-',
          crd: crds || '-',
          destination: destinations || '-',
          article: articles || '-',
          factory: factoryDisplayBox || f,
          cellLine: cells || '-',
          date: dateDisplay || '-'
        }
      };
    });
  }, [factories, aqlData, rawData, factoryKey, modelKey, poKey, crdKey, destinationKey, articleKey, cellKey, dateKey, filters.startDate, prefetchedImagesMap]);

  return (
    <div
      id="aql-email-export-container"
      style={{
        background: '#ffffff',
        padding: '24px 28px',
        color: '#0f172a',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        boxSizing: 'border-box',
        width: 'fit-content',
        minWidth: `${540 + 460 + (factories.length * 750) + 60}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}
    >
      {/* ── TOP HEADER BANNER ── */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', marginBottom: '4px' }}>
        <div
          style={{
            backgroundColor: '#FFE500',
            color: '#000000',
            fontWeight: 900,
            fontSize: '18px',
            padding: '5px 36px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            borderRadius: '3px'
          }}
        >
          BY BUILDING
        </div>
      </div>

      {/* ── CARDS ROW ── */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', alignItems: 'stretch' }}>

        {/* ══════════════════════════════════════════════════════════
            COLUMN 1: OVERALL BUILDING
           ══════════════════════════════════════════════════════════ */}
        <div style={{ width: '540px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Top Yellow Badge */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <div
              style={{
                backgroundColor: '#FFE500',
                color: '#000000',
                fontWeight: 900,
                fontSize: '13px',
                padding: '3px 20px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                borderRadius: '3px'
              }}
            >
              OVERALL BUILDING
            </div>
          </div>

          {/* Card Body */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              borderRadius: '3px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              flex: 1
            }}
          >
            {/* Header Banner: FACTORY + PASS RATE */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  FACTORY
                </span>
                <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', letterSpacing: '0.5px' }}>
                  {factoryListString || 'ALL'}
                </span>
              </div>

              {/* Pass Rate Badge */}
              <div
                style={{
                  backgroundColor: parseFloat(overallStats.passRate) >= 90 ? 'rgba(22,163,74,0.12)' : parseFloat(overallStats.passRate) >= 70 ? 'rgba(217,119,6,0.12)' : 'rgba(220,38,38,0.12)',
                  border: `1px solid ${parseFloat(overallStats.passRate) >= 90 ? 'rgba(22,163,74,0.4)' : parseFloat(overallStats.passRate) >= 70 ? 'rgba(217,119,6,0.4)' : 'rgba(220,38,38,0.4)'}`,
                  padding: '3px 10px',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>PASS RATE</span>
                <span style={{ fontSize: '13px', fontWeight: 900, color: parseFloat(overallStats.passRate) >= 90 ? '#15803d' : parseFloat(overallStats.passRate) >= 70 ? '#b45309' : '#b91c1c' }}>
                  {formatPercentIndo(overallStats.passRate)}
                </span>
              </div>
            </div>

            {/* 4x2 KPI Grid (8 Boxes) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {/* Row 1 */}
              {/* QTY ORDER */}
              <div style={{ backgroundColor: '#1e40af', border: '1px solid #1d4ed8', padding: '4px 5px', borderRadius: '3px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '56px' }}>
                <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>QTY ORDER</span>
                <span style={{ fontSize: '17px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>{formatNumberIndo(overallStats.qtyOrder)}</span>
              </div>

              {/* QTY CHECKING */}
              <div style={{ backgroundColor: '#9a3412', border: '1px solid #c2410c', padding: '4px 5px', borderRadius: '3px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '56px' }}>
                <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>QTY CHECKING</span>
                <span style={{ fontSize: '17px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>{formatNumberIndo(overallStats.qtyChecking)}</span>
              </div>

              {/* TOTAL A-GRADE */}
              <div style={{ backgroundColor: '#166534', border: '1px solid #15803d', padding: '4px 5px', borderRadius: '3px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '56px' }}>
                <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>TOTAL A-GRADE</span>
                <span style={{ fontSize: '17px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>{formatNumberIndo(overallStats.totalAGrade)}</span>
              </div>

              {/* TOTAL B-GRADE */}
              <div style={{ backgroundColor: '#c2410c', border: '1px solid #ea580c', padding: '4px 5px', borderRadius: '3px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '56px' }}>
                <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>TOTAL B-GRADE</span>
                <span style={{ fontSize: '17px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>{formatNumberIndo(overallStats.totalBGrade)}</span>
              </div>

              {/* Row 2 */}
              {/* TOTAL DEFECT */}
              <div style={{ backgroundColor: '#b91c1c', border: '1px solid #dc2626', padding: '4px 5px', borderRadius: '3px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '56px' }}>
                <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>TOTAL DEFECT</span>
                <span style={{ fontSize: '17px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>{formatNumberIndo(overallStats.totalDefects)}</span>
              </div>

              {/* QTY MINOR DEFECT */}
              <div style={{ backgroundColor: '#b45309', border: '1px solid #d97706', padding: '4px 5px', borderRadius: '3px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '56px' }}>
                <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>QTY MINOR</span>
                <span style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>
                  {formatNumberIndo(overallStats.minorDefect)}
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)' }}>/{overallLimits.minor}</span>
                </span>
              </div>

              {/* QTY MAJOR DEFECT */}
              <div style={{ backgroundColor: '#c2410c', border: '1px solid #ea580c', padding: '4px 5px', borderRadius: '3px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '56px' }}>
                <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>QTY MAJOR</span>
                <span style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>
                  {formatNumberIndo(overallStats.majorDefect)}
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)' }}>/{overallLimits.major}</span>
                </span>
              </div>

              {/* QTY CRITICAL DEFECT */}
              <div style={{ backgroundColor: '#991b1b', border: '1px solid #b91c1c', padding: '4px 5px', borderRadius: '3px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '56px' }}>
                <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>QTY CRITICAL</span>
                <span style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>
                  {formatNumberIndo(overallStats.criticalDefect)}
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)' }}>/{overallLimits.critical}</span>
                </span>
              </div>
            </div>

            {/* TOP 5 DEFECT Chart */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '8px',
                borderRadius: '3px'
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  color: '#0f172a',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  borderBottom: '1px solid #e2e8f0',
                  paddingBottom: '4px',
                  marginBottom: '6px'
                }}
              >
                TOP 5 DEFECT
              </div>
              <EmailDefectChart data={overallTopDefects} height={225} />
            </div>

            {/* Building Status Chart */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '8px',
                borderRadius: '3px',
                marginTop: 'auto'
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '4px'
                }}
              >
                🏢 AQL 3RD PARTY — BUILDING STATUS (PASS / FAIL)
              </div>
              <EmailBuildingStatusChart data={overallBuildingChartData} height={160} />
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            COLUMN 2: PEMISAH / SUMMARY TABLE BY BUILDING
           ══════════════════════════════════════════════════════════ */}
        <div style={{ width: '460px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Top Yellow Badge */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <div
              style={{
                backgroundColor: '#FFE500',
                color: '#000000',
                fontWeight: 900,
                fontSize: '13px',
                padding: '3px 20px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                borderRadius: '3px'
              }}
            >
              BUILDING SUMMARY TABLE
            </div>
          </div>

          {/* Card Body */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              borderRadius: '3px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              flex: 1
            }}
          >
            {/* Header Banner */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
                BUILDING BREAKDOWN
              </span>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#b45309' }}>
                {factories.length} BUILDINGS
              </span>
            </div>

            {/* Table Comparison */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '3px',
                overflow: 'hidden'
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', textAlign: 'center' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', color: '#1e293b', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ padding: '7px 6px', textAlign: 'left', fontWeight: 800, fontSize: '9px' }}>BUILDING</th>
                    <th style={{ padding: '7px 6px', fontWeight: 800, fontSize: '9px' }}>CHECKING</th>
                    <th style={{ padding: '7px 6px', fontWeight: 800, fontSize: '9px', color: '#16a34a' }}>PASS</th>
                    <th style={{ padding: '7px 6px', fontWeight: 800, fontSize: '9px', color: '#dc2626' }}>FAIL</th>
                    <th style={{ padding: '7px 6px', fontWeight: 800, fontSize: '9px', color: '#16a34a' }}>PASS RATE</th>
                  </tr>
                </thead>
                <tbody>
                  {factoryDataList.map((fItem, idx) => (
                    <tr
                      key={fItem.factory}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                      }}
                    >
                      <td style={{ padding: '6px 5px', textAlign: 'left', fontWeight: 900, color: '#0f172a' }}>
                        {fItem.factory}
                      </td>
                      <td style={{ padding: '6px 5px', fontWeight: 800, color: '#0f172a' }}>
                        {formatNumberIndo(fItem.stats.qtyChecking)}
                      </td>
                      <td style={{ padding: '6px 5px', fontWeight: 900, color: '#16a34a' }}>
                        {fItem.stats.pass}
                      </td>
                      <td style={{ padding: '6px 5px', fontWeight: 900, color: '#dc2626' }}>
                        {fItem.stats.fail}
                      </td>
                      <td style={{ padding: '6px 5px', fontWeight: 900, color: parseFloat(fItem.stats.passRate) >= 90 ? '#16a34a' : parseFloat(fItem.stats.passRate) >= 70 ? '#d97706' : '#dc2626' }}>
                        {formatPercentIndo(fItem.stats.passRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#e2e8f0', borderTop: '2px solid #94a3b8', fontWeight: 900 }}>
                    <td style={{ padding: '7px 6px', textAlign: 'left', color: '#000000', fontWeight: 900, fontSize: '10px' }}>
                      OVERALL
                    </td>
                    <td style={{ padding: '7px 6px', color: '#0f172a', fontWeight: 900 }}>
                      {formatNumberIndo(overallStats.qtyChecking)}
                    </td>
                    <td style={{ padding: '7px 6px', color: '#16a34a', fontWeight: 900 }}>
                      {overallStats.pass}
                    </td>
                    <td style={{ padding: '7px 6px', color: '#dc2626', fontWeight: 900 }}>
                      {overallStats.fail}
                    </td>
                    <td style={{ padding: '7px 6px', color: '#16a34a', fontWeight: 900 }}>
                      {formatPercentIndo(overallStats.passRate)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Visual Mini Comparison Bar / Overview Box */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '10px',
                borderRadius: '3px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                flex: 1
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 900,
                  color: '#0f172a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                📊 PASS RATE PERFORMANCE BY BUILDING
              </div>

              {factoryDataList.map((fItem) => {
                const prNum = parseFloat(fItem.stats.passRate) || 0;
                const barColor = prNum >= 90 ? '#16a34a' : prNum >= 70 ? '#d97706' : '#dc2626';
                return (
                  <div key={fItem.factory} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', fontWeight: 800 }}>
                      <span style={{ color: '#0f172a' }}>{fItem.factoryBadgeTitle}</span>
                      <span style={{ color: barColor }}>{formatPercentIndo(fItem.stats.passRate)}</span>
                    </div>
                    <div style={{ width: '100%', height: '9px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(0, prNum))}%`,
                          height: '100%',
                          backgroundColor: barColor,
                          borderRadius: '3px'
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Overall Total Pass Rate Bar */}
              <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', fontWeight: 900, marginBottom: '3px' }}>
                  <span style={{ color: '#0f172a' }}>TOTAL (OVERALL)</span>
                  <span style={{ color: '#16a34a' }}>{formatPercentIndo(overallStats.passRate)}</span>
                </div>
                <div style={{ width: '100%', height: '10px', backgroundColor: '#cbd5e1', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(0, parseFloat(overallStats.passRate) || 0))}%`,
                      height: '100%',
                      backgroundColor: '#16a34a',
                      borderRadius: '3px'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            COLUMNS 3..N: FACTORY 1, FACTORY 2, FACTORY 4, etc.
           ══════════════════════════════════════════════════════════ */}
        {factoryDataList.map((fItem, fIdx) => (
          <div key={fItem.factory} style={{ width: '750px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            {/* Top Yellow Badge */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
              <div
                style={{
                  backgroundColor: '#FFE500',
                  color: '#000000',
                  fontWeight: 900,
                  fontSize: '13px',
                  padding: '3px 20px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  borderRadius: '3px'
                }}
              >
                {fItem.factoryBadgeTitle}
              </div>
            </div>

            {/* Card Body */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                borderRadius: '3px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                flex: 1
              }}
            >
              {/* Header: FACTORY + PASS RATE */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    FACTORY
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', letterSpacing: '0.5px' }}>
                    {fItem.factory}
                  </span>
                </div>

                {/* Pass Rate Badge */}
                <div
                  style={{
                    backgroundColor: parseFloat(fItem.stats.passRate) >= 90 ? 'rgba(22,163,74,0.12)' : parseFloat(fItem.stats.passRate) >= 70 ? 'rgba(217,119,6,0.12)' : 'rgba(220,38,38,0.12)',
                    border: `1px solid ${parseFloat(fItem.stats.passRate) >= 90 ? 'rgba(22,163,74,0.4)' : parseFloat(fItem.stats.passRate) >= 70 ? 'rgba(217,119,6,0.4)' : 'rgba(220,38,38,0.4)'}`,
                    padding: '3px 10px',
                    borderRadius: '3px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>PASS RATE</span>
                  <span style={{ fontSize: '13px', fontWeight: 900, color: parseFloat(fItem.stats.passRate) >= 90 ? '#15803d' : parseFloat(fItem.stats.passRate) >= 70 ? '#b45309' : '#b91c1c' }}>
                    {formatPercentIndo(fItem.stats.passRate)}
                  </span>
                </div>
              </div>

              {/* Header: 4x2 Metadata Boxes + 4x2 KPI Grid */}
              <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'stretch' }}>

                {/* Left: 4x2 Metadata Table */}
                <div style={{ width: '48%', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                  {/* Row 1 */}
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '4px 3px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '56px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>PO</span>
                    <span style={{ fontSize: '9px', color: '#0f172a', fontWeight: 800, lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', width: '100%', wordBreak: 'break-word' }}>{fItem.meta.po}</span>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '4px 3px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '56px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>MODEL</span>
                    <span style={{ fontSize: '9px', color: '#0f172a', fontWeight: 800, lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', width: '100%', wordBreak: 'break-word' }}>{fItem.meta.model}</span>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '4px 3px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '56px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CRD</span>
                    <span style={{ fontSize: '9px', color: '#0f172a', fontWeight: 800, lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', width: '100%', wordBreak: 'break-word' }}>{fItem.meta.crd}</span>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '4px 3px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '56px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>DESTINATION</span>
                    <span style={{ fontSize: '9px', color: '#0f172a', fontWeight: 800, lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', width: '100%', wordBreak: 'break-word' }}>{fItem.meta.destination}</span>
                  </div>

                  {/* Row 2 */}
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '4px 3px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '56px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ARTICLE</span>
                    <span style={{ fontSize: '9px', color: '#0f172a', fontWeight: 800, lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', width: '100%', wordBreak: 'break-word' }}>{fItem.meta.article}</span>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '4px 3px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '56px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>FACTORY</span>
                    <span style={{ fontSize: '9px', color: '#0f172a', fontWeight: 800, lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', width: '100%', wordBreak: 'break-word' }}>{fItem.meta.factory}</span>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '4px 3px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '56px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CELL / LINE</span>
                    <span style={{ fontSize: '9px', color: '#0f172a', fontWeight: 800, lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', width: '100%', wordBreak: 'break-word' }}>{fItem.meta.cellLine}</span>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '4px 3px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '56px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>DATE</span>
                    <span style={{ fontSize: '9px', color: '#0f172a', fontWeight: 800, lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', width: '100%', wordBreak: 'break-word' }}>{fItem.meta.date}</span>
                  </div>
                </div>

                {/* Right: 4x2 KPI Grid */}
                <div style={{ width: '52%', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {/* Row 1 */}
                  {/* QTY ORDER */}
                  <div style={{ backgroundColor: '#1e40af', border: '1px solid #1d4ed8', padding: '4px 5px', borderRadius: '3px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '56px' }}>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>QTY ORDER</span>
                    <span style={{ fontSize: '17px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>{formatNumberIndo(fItem.stats.qtyOrder)}</span>
                  </div>

                  {/* QTY CHECKING */}
                  <div style={{ backgroundColor: '#9a3412', border: '1px solid #c2410c', padding: '4px 5px', borderRadius: '3px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '56px' }}>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>QTY CHECKING</span>
                    <span style={{ fontSize: '17px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>{formatNumberIndo(fItem.stats.qtyChecking)}</span>
                  </div>

                  {/* TOTAL A-GRADE */}
                  <div style={{ backgroundColor: '#166534', border: '1px solid #15803d', padding: '4px 5px', borderRadius: '3px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '56px' }}>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>TOTAL A-GRADE</span>
                    <span style={{ fontSize: '17px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>{formatNumberIndo(fItem.stats.totalAGrade)}</span>
                  </div>

                  {/* TOTAL B-GRADE */}
                  <div style={{ backgroundColor: '#c2410c', border: '1px solid #ea580c', padding: '4px 5px', borderRadius: '3px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '56px' }}>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>TOTAL B-GRADE</span>
                    <span style={{ fontSize: '17px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>{formatNumberIndo(fItem.stats.totalBGrade)}</span>
                  </div>

                  {/* Row 2 */}
                  {/* TOTAL DEFECT */}
                  <div style={{ backgroundColor: '#b91c1c', border: '1px solid #dc2626', padding: '4px 5px', borderRadius: '3px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '56px' }}>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>TOTAL DEFECT</span>
                    <span style={{ fontSize: '17px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>{formatNumberIndo(fItem.stats.totalDefects)}</span>
                  </div>

                  {/* QTY MINOR DEFECT */}
                  <div style={{ backgroundColor: '#b45309', border: '1px solid #d97706', padding: '4px 5px', borderRadius: '3px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '56px' }}>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>QTY MINOR</span>
                    <span style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>
                      {formatNumberIndo(fItem.stats.minorDefect)}
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)' }}>/{fItem.limits.minor}</span>
                    </span>
                  </div>

                  {/* QTY MAJOR DEFECT */}
                  <div style={{ backgroundColor: '#c2410c', border: '1px solid #ea580c', padding: '4px 5px', borderRadius: '3px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '56px' }}>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>QTY MAJOR</span>
                    <span style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>
                      {formatNumberIndo(fItem.stats.majorDefect)}
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)' }}>/{fItem.limits.major}</span>
                    </span>
                  </div>

                  {/* QTY CRITICAL DEFECT */}
                  <div style={{ backgroundColor: '#991b1b', border: '1px solid #b91c1c', padding: '4px 5px', borderRadius: '3px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '56px' }}>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>QTY CRITICAL</span>
                    <span style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>
                      {formatNumberIndo(fItem.stats.criticalDefect)}
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)' }}>/{fItem.limits.critical}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Middle Area: TOP 5 DEFECT (Left 48%) + DEFECT PHOTOS (Right 52%) */}
              <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'stretch' }}>

                {/* Left: TOP 5 DEFECT */}
                <div
                  style={{
                    width: '48%',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    padding: '6px',
                    borderRadius: '3px'
                  }}
                >
                  <div
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 900,
                      color: '#0f172a',
                      textAlign: 'center',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      borderBottom: '1px solid #e2e8f0',
                      paddingBottom: '4px',
                      marginBottom: '4px'
                    }}
                  >
                    TOP 5 DEFECT
                  </div>
                  <EmailDefectChart data={fItem.topDefects} height={225} />
                </div>

                {/* Right: DEFECT PHOTOS (Grid of up to 5 photos) */}
                <div
                  style={{
                    width: '52%',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    padding: '6px',
                    borderRadius: '3px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {/* Photo Grid (Row 1: 3 photos, Row 2: 2 photos centered) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, justifyContent: 'center' }}>
                    {/* Row 1: 3 photos */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' }}>
                      {[0, 1, 2].map(idx => {
                        const defect = fItem.images[idx] || { name: 'NO DATA', url: null, dataUri: null };
                        const imgSrc = defect.dataUri || defect.url;
                        return (
                          <div
                            key={idx}
                            style={{
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '3px',
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column'
                            }}
                          >
                            <div style={{ height: '88px', width: '100%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                              {imgSrc ? (
                                <img
                                  src={imgSrc}
                                  alt={defect.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  crossOrigin="anonymous"
                                />
                              ) : (
                                <span style={{ fontSize: '8.5px', color: '#94a3b8', textTransform: 'uppercase' }}>NO IMAGE</span>
                              )}
                            </div>
                            <div
                              style={{
                                backgroundColor: '#ffffff',
                                padding: '3px 4px',
                                textAlign: 'center',
                                fontSize: '8px',
                                fontWeight: 800,
                                color: '#0f172a',
                                textTransform: 'uppercase',
                                lineHeight: 1.1,
                                height: '26px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderTop: '1px solid #e2e8f0'
                              }}
                            >
                              <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {defect.name}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Row 2: 2 photos centered */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
                      {[3, 4].map(idx => {
                        const defect = fItem.images[idx] || { name: 'NO DATA', url: null, dataUri: null };
                        const imgSrc = defect.dataUri || defect.url;
                        return (
                          <div
                            key={idx}
                            style={{
                              width: '32%',
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '3px',
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column'
                            }}
                          >
                            <div style={{ height: '88px', width: '100%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                              {imgSrc ? (
                                <img
                                  src={imgSrc}
                                  alt={defect.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  crossOrigin="anonymous"
                                />
                              ) : (
                                <span style={{ fontSize: '8.5px', color: '#94a3b8', textTransform: 'uppercase' }}>NO IMAGE</span>
                              )}
                            </div>
                            <div
                              style={{
                                backgroundColor: '#ffffff',
                                padding: '3px 4px',
                                textAlign: 'center',
                                fontSize: '8px',
                                fontWeight: 800,
                                color: '#0f172a',
                                textTransform: 'uppercase',
                                lineHeight: 1.1,
                                height: '26px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderTop: '1px solid #e2e8f0'
                              }}
                            >
                              <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {defect.name}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom Area: Building Status Chart */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '8px',
                  borderRadius: '3px',
                  marginTop: 'auto'
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '4px'
                  }}
                >
                  🏢 AQL 3RD PARTY — BUILDING STATUS (PASS / FAIL)
                </div>
                <EmailBuildingStatusChart data={fItem.buildingChartData} height={160} />
              </div>

            </div>
          </div>
        ))}

      </div>
    </div>
  );
};

export default AqlEmailExportView;
