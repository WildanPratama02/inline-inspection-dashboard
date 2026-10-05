import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
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
 * Compute KPI stats for a slice of data
 */
export const computeStats = (data, rawData) => {
  if (!data || data.length === 0) {
    return {
      qtyInspection: 0,
      qtyDefect: 0,
      rft: '0.0',
      defectRate: '0.0',
      aGrade: 0,
      bGrade: 0,
      totalQtyOrder: 0
    };
  }

  const firstItem = rawData[0] || {};
  const qtyInsKey = findKey(firstItem, 'qty_inspection', 'qty inspection');
  const totalDefectKey = findKey(firstItem, 'total_defect', 'total defect', 'qty_defect', 'qty defect');
  const aGradeKey = findKey(firstItem, 'total_a_grade', 'total a grade', 'a_grade', 'a grade', 'agrade', 'a-grade', 'grade_a', 'grade a');
  const bGradeKey = findKey(firstItem, 'b_grade', 'b grade', 'bgrade', 'avg_b_grade', 'avg b grade');
  const rftKey = findKey(firstItem, 'rft');

  const qtyDefectKeys = [];
  for (let i = 1; i <= 25; i++) {
    qtyDefectKeys[i] = findKey(firstItem, `qty_defect_${i}`, `qty defect ${i}`, `qtydefect${i}`);
  }

  let totalInspection = 0;
  let totalDefects = 0;
  let totalAGrade = 0;
  let totalBGrade = 0;
  let sumRft = 0;
  let countRft = 0;

  data.forEach(item => {
    totalInspection += parseNumber(item[qtyInsKey]);
    totalAGrade += parseNumber(item[aGradeKey]);
    totalBGrade += parseNumber(item[bGradeKey]);

    if (totalDefectKey) {
      totalDefects += parseNumber(item[totalDefectKey]);
    } else {
      for (let i = 1; i <= 25; i++) {
        if (qtyDefectKeys[i]) totalDefects += parseNumber(item[qtyDefectKeys[i]]);
      }
    }

    if (rftKey) {
      const val = parsePercent(item[rftKey]);
      if (val !== null) {
        sumRft += val;
        countRft++;
      }
    }
  });

  const rftVal = totalInspection > 0
    ? ((totalAGrade / totalInspection) * 100)
    : 0;

  const rft = rftVal > 0 ? rftVal.toFixed(1) : '0.0';
  const defectRateVal = totalInspection > 0
    ? ((totalDefects / totalInspection) * 100)
    : 0;
  const defectRate = defectRateVal > 0 ? defectRateVal.toFixed(1) : '0.0';

  return {
    qtyInspection: totalInspection,
    qtyDefect: totalDefects,
    rft,
    defectRate,
    aGrade: totalAGrade,
    bGrade: totalBGrade
  };
};

/**
 * Compute Top 5 defect stats for a slice of data
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
 * Compute RFT by Date - synchronized with computeStats
 */
export const computeRftByDate = (data, rawData, overallRftFallback = null) => {
  if (!data || data.length === 0) {
    if (overallRftFallback !== null) {
      return [{ date: 'Total', rft: parseFloat(overallRftFallback) || 0 }];
    }
    return [];
  }
  const firstItem = rawData[0] || {};
  const dateKey = findKey(firstItem, 'date');
  const qtyInsKey = findKey(firstItem, 'qty_inspection', 'qty inspection');
  const aGradeKey = findKey(firstItem, 'total_a_grade', 'total a grade', 'a_grade', 'a grade', 'agrade', 'a-grade', 'grade_a', 'grade a');
  const totalDefectKey = findKey(firstItem, 'total_defect', 'total defect', 'qty_defect', 'qty defect');
  const rftKey = findKey(firstItem, 'rft');

  const qtyDefectKeys = [];
  for (let i = 1; i <= 25; i++) {
    qtyDefectKeys[i] = findKey(firstItem, `qty_defect_${i}`, `qty defect ${i}`);
  }

  const dateMap = {};
  data.forEach(item => {
    const dStr = item[dateKey] || '';
    if (!dStr) return;
    if (!dateMap[dStr]) {
      dateMap[dStr] = { inspection: 0, aGrade: 0, defects: 0, sumRft: 0, countRft: 0 };
    }
    dateMap[dStr].inspection += parseNumber(item[qtyInsKey]);
    dateMap[dStr].aGrade += parseNumber(item[aGradeKey]);
    if (totalDefectKey) {
      dateMap[dStr].defects += parseNumber(item[totalDefectKey]);
    } else {
      for (let i = 1; i <= 25; i++) {
        if (qtyDefectKeys[i]) dateMap[dStr].defects += parseNumber(item[qtyDefectKeys[i]]);
      }
    }

    if (rftKey) {
      const val = parsePercent(item[rftKey]);
      if (val !== null) {
        dateMap[dStr].sumRft += val;
        dateMap[dStr].countRft++;
      }
    }
  });

  const entries = Object.entries(dateMap).sort(([a], [b]) => a.localeCompare(b));

  // If there's 1 date or fewer, ensure the exact RFT matches the top KPI RFT value
  if (entries.length <= 1 && overallRftFallback !== null) {
    const dateLabel = entries.length === 1 ? formatEmailDate(entries[0][0]) : 'Total';
    return [{
      date: dateLabel,
      rft: parseFloat(overallRftFallback) || 0
    }];
  }

  return entries.map(([dStr, stat]) => {
    const rftVal = stat.inspection > 0
      ? ((stat.aGrade / stat.inspection) * 100)
      : 0;
    return {
      date: formatEmailDate(dStr),
      rft: parseFloat(rftVal.toFixed(1))
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

/* ─── RFT By Date Chart ─── */
const EmailRftDateChart = ({ data, height = 150 }) => {
  return (
    <div style={{ width: '100%', height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 18, right: 18, left: 8, bottom: 6 }} barSize={46}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#334155', fontSize: 9.5, fontWeight: 'bold' }}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fill: '#64748b', fontSize: 9 }}
            tickFormatter={v => `${v}%`}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={false}
            width={38}
          />
          <Bar dataKey="rft" fill="#EAB308" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            <LabelList
              dataKey="rft"
              position="top"
              fill="#0f172a"
              fontSize={10.5}
              fontWeight="bold"
              formatter={v => (v != null ? formatPercentIndo(v) : '')}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ─── Main PsiEmailExportView Component ─── */
const PsiEmailExportView = ({
  psiData = [],
  rawData = [],
  filters = {},
  prefetchedImagesMap = {} // { [factoryKey]: [{ name, url, dataUri }] }
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
    psiData.forEach(item => {
      const f = String(item[factoryKey] || '').trim();
      if (f && f !== '-') set.add(f);
    });
    return Array.from(set).sort();
  }, [psiData, factoryKey]);

  // 2. Compute Overall Data
  const overallStats = useMemo(() => computeStats(psiData, rawData), [psiData, rawData]);
  const overallTopDefects = useMemo(() => computeTopDefects(psiData, rawData), [psiData, rawData]);
  const overallRftByDate = useMemo(() => computeRftByDate(psiData, rawData, overallStats.rft), [psiData, rawData, overallStats.rft]);

  // Overall Factory List Text (e.g. "F 1, F 3, F 4")
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
      const fData = psiData.filter(item => String(item[factoryKey] || '').trim() === f);
      const stats = computeStats(fData, rawData);
      const topDefects = computeTopDefects(fData, rawData);
      const rftByDate = computeRftByDate(fData, rawData, stats.rft);

      // Metadata matching user screenshot:
      // Row 1: PO, MODEL, CRD, DESTINATION
      // Row 2: ARTICLE, FACTORY, CELL / LINE, DATE
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

      // Defect images for this factory (use prefetched if available)
      const images = (prefetchedImagesMap[f] && prefetchedImagesMap[f].length > 0)
        ? prefetchedImagesMap[f]
        : topDefects.map(d => ({ name: d.name, url: d.url ? d.url.replace('https://www.appsheet.com', '/appsheet-img') : null }));

      // Format factory title badge
      let factoryBadgeTitle = f.toUpperCase();
      if (/^F\d+/i.test(f)) {
        factoryBadgeTitle = f.toUpperCase().replace(/^F/, 'FACTORY ');
      }

      // Format factory name for metadata box e.g. "F 1" or "F 3"
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
        topDefects,
        rftByDate,
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
  }, [factories, psiData, rawData, factoryKey, modelKey, poKey, crdKey, destinationKey, articleKey, cellKey, dateKey, filters.startDate, prefetchedImagesMap]);

  return (
    <div
      id="psi-email-export-container"
      style={{
        background: '#ffffff',
        padding: '24px 28px',
        color: '#0f172a',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        boxSizing: 'border-box',
        width: 'fit-content',
        minWidth: `${520 + 460 + (factories.length * 750) + 60}px`,
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
        <div style={{ width: '520px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
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
            {/* Header Banner: BUILDING F 1, F 3, F 4 */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
                BUILDING
              </span>
              <span style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', letterSpacing: '0.5px' }}>
                {factoryListString || 'ALL'}
              </span>
            </div>

            {/* 2x3 KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {/* Row 1 */}
              {/* QTY INSPECTION */}
              <div
                style={{
                  backgroundColor: '#1e40af',
                  border: '1px solid #1d4ed8',
                  padding: '5px 8px',
                  borderRadius: '3px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '66px'
                }}
              >
                <span style={{ fontSize: '9.5px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>
                  QTY INSPECTION
                </span>
                <span style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>
                  {formatNumberIndo(overallStats.qtyInspection)}
                </span>
              </div>

              {/* QTY DEFECT */}
              <div
                style={{
                  backgroundColor: '#b91c1c',
                  border: '1px solid #dc2626',
                  padding: '5px 8px',
                  borderRadius: '3px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '66px'
                }}
              >
                <span style={{ fontSize: '9.5px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>
                  QTY DEFECT
                </span>
                <span style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>
                  {formatNumberIndo(overallStats.qtyDefect)}
                </span>
              </div>

              {/* RFT */}
              <div
                style={{
                  backgroundColor: '#15803d',
                  border: '1px solid #16a34a',
                  padding: '5px 8px',
                  borderRadius: '3px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '66px'
                }}
              >
                <span style={{ fontSize: '9.5px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>
                  RFT
                </span>
                <span style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>
                  {formatPercentIndo(overallStats.rft)}
                </span>
              </div>

              {/* Row 2 */}
              {/* A GRADE */}
              <div
                style={{
                  backgroundColor: '#166534',
                  border: '1px solid #15803d',
                  padding: '5px 8px',
                  borderRadius: '3px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '66px'
                }}
              >
                <span style={{ fontSize: '9.5px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>
                  A GRADE
                </span>
                <span style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>
                  {formatNumberIndo(overallStats.aGrade)}
                </span>
              </div>

              {/* B GRADE */}
              <div
                style={{
                  backgroundColor: '#c2410c',
                  border: '1px solid #ea580c',
                  padding: '5px 8px',
                  borderRadius: '3px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '66px'
                }}
              >
                <span style={{ fontSize: '9.5px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>
                  B GRADE
                </span>
                <span style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>
                  {formatNumberIndo(overallStats.bGrade)}
                </span>
              </div>

              {/* DEFECT RATE */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)',
                  border: '1px solid #991b1b',
                  padding: '5px 8px',
                  borderRadius: '3px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '66px'
                }}
              >
                <span style={{ fontSize: '9.5px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>
                  DEFECT RATE
                </span>
                <span style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>
                  {formatPercentIndo(overallStats.defectRate)}
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

            {/* RFT BY DATE Chart */}
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
                📈 RFT BY DATE
              </div>
              <EmailRftDateChart data={overallRftByDate} height={150} />
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
                    <th style={{ padding: '7px 6px', fontWeight: 800, fontSize: '9px' }}>INSP</th>
                    <th style={{ padding: '7px 6px', fontWeight: 800, fontSize: '9px', color: '#dc2626' }}>DEFECT</th>
                    <th style={{ padding: '7px 6px', fontWeight: 800, fontSize: '9px', color: '#16a34a' }}>RFT %</th>
                    <th style={{ padding: '7px 6px', fontWeight: 800, fontSize: '9px' }}>A-GRD</th>
                    <th style={{ padding: '7px 6px', fontWeight: 800, fontSize: '9px' }}>B-GRD</th>
                    <th style={{ padding: '7px 6px', fontWeight: 800, fontSize: '9px', color: '#dc2626' }}>DEF %</th>
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
                        {formatNumberIndo(fItem.stats.qtyInspection)}
                      </td>
                      <td style={{ padding: '6px 5px', fontWeight: 800, color: '#dc2626' }}>
                        {formatNumberIndo(fItem.stats.qtyDefect)}
                      </td>
                      <td style={{ padding: '6px 5px', fontWeight: 900, color: '#16a34a' }}>
                        {formatPercentIndo(fItem.stats.rft)}
                      </td>
                      <td style={{ padding: '6px 5px', fontWeight: 700, color: '#334155' }}>
                        {formatNumberIndo(fItem.stats.aGrade)}
                      </td>
                      <td style={{ padding: '6px 5px', fontWeight: 700, color: '#334155' }}>
                        {formatNumberIndo(fItem.stats.bGrade)}
                      </td>
                      <td style={{ padding: '6px 5px', fontWeight: 900, color: '#dc2626' }}>
                        {formatPercentIndo(fItem.stats.defectRate)}
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
                      {formatNumberIndo(overallStats.qtyInspection)}
                    </td>
                    <td style={{ padding: '7px 6px', color: '#dc2626', fontWeight: 900 }}>
                      {formatNumberIndo(overallStats.qtyDefect)}
                    </td>
                    <td style={{ padding: '7px 6px', color: '#16a34a', fontWeight: 900 }}>
                      {formatPercentIndo(overallStats.rft)}
                    </td>
                    <td style={{ padding: '7px 6px', color: '#0f172a', fontWeight: 900 }}>
                      {formatNumberIndo(overallStats.aGrade)}
                    </td>
                    <td style={{ padding: '7px 6px', color: '#0f172a', fontWeight: 900 }}>
                      {formatNumberIndo(overallStats.bGrade)}
                    </td>
                    <td style={{ padding: '7px 6px', color: '#dc2626', fontWeight: 900 }}>
                      {formatPercentIndo(overallStats.defectRate)}
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
                📊 RFT PERFORMANCE BY BUILDING
              </div>

              {factoryDataList.map((fItem) => {
                const rftNum = parseFloat(fItem.stats.rft) || 0;
                const barColor = rftNum >= 85 ? '#16a34a' : rftNum >= 70 ? '#d97706' : '#dc2626';
                return (
                  <div key={fItem.factory} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', fontWeight: 800 }}>
                      <span style={{ color: '#0f172a' }}>{fItem.factoryBadgeTitle}</span>
                      <span style={{ color: barColor }}>{formatPercentIndo(fItem.stats.rft)}</span>
                    </div>
                    <div style={{ width: '100%', height: '9px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(0, rftNum))}%`,
                          height: '100%',
                          backgroundColor: barColor,
                          borderRadius: '3px'
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Overall Total RFT Bar */}
              <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', fontWeight: 900, marginBottom: '3px' }}>
                  <span style={{ color: '#0f172a' }}>TOTAL (OVERALL)</span>
                  <span style={{ color: '#16a34a' }}>{formatPercentIndo(overallStats.rft)}</span>
                </div>
                <div style={{ width: '100%', height: '10px', backgroundColor: '#cbd5e1', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(0, parseFloat(overallStats.rft) || 0))}%`,
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
            COLUMNS 3..N: FACTORY 1, FACTORY 3, FACTORY 4, etc.
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
              {/* Header: 4x2 Metadata Boxes + 2x3 KPI Grid */}
              <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'stretch' }}>

                {/* Left: 4x2 Metadata Table exactly matching user's photo */}
                <div style={{ width: '48%', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                  {/* ── ROW 1: PO, MODEL, CRD, DESTINATION ── */}
                  {/* PO */}
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '4px 3px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '56px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>PO</span>
                    <span style={{ fontSize: '9px', color: '#0f172a', fontWeight: 800, lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', width: '100%', wordBreak: 'break-word' }}>{fItem.meta.po}</span>
                  </div>

                  {/* MODEL */}
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '4px 3px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '56px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>MODEL</span>
                    <span style={{ fontSize: '9px', color: '#0f172a', fontWeight: 800, lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', width: '100%', wordBreak: 'break-word' }}>{fItem.meta.model}</span>
                  </div>

                  {/* CRD */}
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '4px 3px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '56px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CRD</span>
                    <span style={{ fontSize: '9px', color: '#0f172a', fontWeight: 800, lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', width: '100%', wordBreak: 'break-word' }}>{fItem.meta.crd}</span>
                  </div>

                  {/* DESTINATION */}
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '4px 3px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '56px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>DESTINATION</span>
                    <span style={{ fontSize: '9px', color: '#0f172a', fontWeight: 800, lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', width: '100%', wordBreak: 'break-word' }}>{fItem.meta.destination}</span>
                  </div>

                  {/* ── ROW 2: ARTICLE, FACTORY, CELL / LINE, DATE ── */}
                  {/* ARTICLE */}
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '4px 3px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '56px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ARTICLE</span>
                    <span style={{ fontSize: '9px', color: '#0f172a', fontWeight: 800, lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', width: '100%', wordBreak: 'break-word' }}>{fItem.meta.article}</span>
                  </div>

                  {/* BUILDING */}
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '4px 3px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '56px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>BUILDING</span>
                    <span style={{ fontSize: '9px', color: '#0f172a', fontWeight: 800, lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', width: '100%', wordBreak: 'break-word' }}>{fItem.meta.factory}</span>
                  </div>

                  {/* CELL / LINE */}
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '4px 3px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '56px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CELL / LINE</span>
                    <span style={{ fontSize: '9px', color: '#0f172a', fontWeight: 800, lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', width: '100%', wordBreak: 'break-word' }}>{fItem.meta.cellLine}</span>
                  </div>

                  {/* DATE */}
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '4px 3px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '56px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>DATE</span>
                    <span style={{ fontSize: '9px', color: '#0f172a', fontWeight: 800, lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', width: '100%', wordBreak: 'break-word' }}>{fItem.meta.date}</span>
                  </div>
                </div>

                {/* Right: 2x3 KPI Grid */}
                <div style={{ width: '52%', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {/* QTY INSPECTION */}
                  <div style={{ backgroundColor: '#1e40af', border: '1px solid #1d4ed8', padding: '4px 5px', borderRadius: '3px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '56px' }}>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>QTY INSPECTION</span>
                    <span style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>{formatNumberIndo(fItem.stats.qtyInspection)}</span>
                  </div>

                  {/* QTY DEFECT */}
                  <div style={{ backgroundColor: '#b91c1c', border: '1px solid #dc2626', padding: '4px 5px', borderRadius: '3px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '56px' }}>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>QTY DEFECT</span>
                    <span style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>{formatNumberIndo(fItem.stats.qtyDefect)}</span>
                  </div>

                  {/* RFT */}
                  <div style={{ backgroundColor: '#15803d', border: '1px solid #16a34a', padding: '4px 5px', borderRadius: '3px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '56px' }}>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>RFT</span>
                    <span style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>{formatPercentIndo(fItem.stats.rft)}</span>
                  </div>

                  {/* A GRADE */}
                  <div style={{ backgroundColor: '#166534', border: '1px solid #15803d', padding: '4px 5px', borderRadius: '3px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '56px' }}>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>A GRADE</span>
                    <span style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>{formatNumberIndo(fItem.stats.aGrade)}</span>
                  </div>

                  {/* B GRADE */}
                  <div style={{ backgroundColor: '#c2410c', border: '1px solid #ea580c', padding: '4px 5px', borderRadius: '3px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '56px' }}>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>B GRADE</span>
                    <span style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>{formatNumberIndo(fItem.stats.bGrade)}</span>
                  </div>

                  {/* DEFECT RATE */}
                  <div style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #450a0a 100%)', border: '1px solid #991b1b', padding: '4px 5px', borderRadius: '3px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '56px' }}>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>DEFECT RATE</span>
                    <span style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>{formatPercentIndo(fItem.stats.defectRate)}</span>
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

              {/* Bottom Area: RFT BY DATE Chart */}
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
                  📈 RFT BY DATE
                </div>
                <EmailRftDateChart data={fItem.rftByDate} height={150} />
              </div>

            </div>
          </div>
        ))}

      </div>
    </div>
  );
};

export default PsiEmailExportView;
