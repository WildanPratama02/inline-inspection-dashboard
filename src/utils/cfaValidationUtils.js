import { parseNumber } from './dataUtils.js';

// ── 29 STANDARD DEFECT DICTIONARY ──
export const STANDARD_DEFECTS = [
  'BONDING',
  'BONDING GAP',
  'COLOR DIFFERENCE',
  'CONTAMINATION',
  'CONTAMINATION UPPER',
  'DAMAGED HEPTIC',
  'DAMAGED MATERIAL',
  'DAMAGED O/S',
  'DEFOAM',
  'DIFFERENT COLOR OUT SOLE',
  'FRAYING',
  'HOLES NOT PUNCHED PROPERLY',
  'INCONSISTENT OUTSOLE',
  'LACE DAMAGE',
  'MATERIAL DAMAGE BROKEN OR NOT FUNCTIONING, LACE TIP (VELCRO)',
  'MISS MATCHING',
  'MISS MATCHING COLOR OUTSOLE',
  'OFF CENTER',
  'OVER CEMENTING',
  'POOR DEFINITION',
  'POOR EYESTAY PUNCHY',
  'POOR HAPTIC',
  'POOR POUNCHING',
  'POOR SHAPE/ WRINKLE',
  'PRESSING MARKS',
  'THREAD ENDS',
  'WRINKLE IN LINNING',
  'YELLOWING'
];

// AQL nickname -> words of the full name used in T1QM CFA NAME, for nicknames
// that are not part of the full name itself
export const CFA_NAME_ALIASES = {
  INA: ['ZULIA']
};

// AQL INSPECTOR NAME spelling variants -> one name per CFA
//   NELLI   = NELLI FATIMAH
//   ALFINDA = ALFINDA DWI FIRMANSYAH
//   FIRDAUS = FIRDAUS MAKANANA
//   SOFIA   = SOFIA PUTRI ANGGRAENI
//   EVA JULIYANI (plain "EVA" in AQL is EVA JULIYANI, not EVA ARIYANI)
//   AZIZAH  ("AZZIAH" is a typo; AZZI is a different CFA)
export const CFA_NAME_CANONICAL = {
  NELI: 'NELLI',
  ALFIN: 'ALFINDA',
  DAUS: 'FIRDAUS',
  SOFI: 'SOFIA',
  SHOFI: 'SOFIA',
  EVA: 'EVA JULIYANI',
  AZZIAH: 'AZIZAH'
};

// AQL INSPECTOR NAME values that are not CFAs: test entries and inspectors outside the CFA team
export const EXCLUDED_CFA_NAMES = ['CMA TEST', 'AGIS', 'REKA', 'HILHAM', 'AZZI'];

/**
 * Split AQL INSPECTOR NAME into individual, canonical CFA names.
 * Joint inspections are typed as one cell: "YANWAR, IDA, EVA ARIYANI".
 */
export const splitCfaNames = (rawName) => {
  const names = String(rawName || '')
    .split(/\s*[,&]\s*/)
    .map(n => n.trim().toUpperCase().replace(/\s+/g, ' '))
    .map(n => CFA_NAME_CANONICAL[n] || n)
    .filter(n => n && n !== '-' && !EXCLUDED_CFA_NAMES.includes(n));
  return [...new Set(names)];
};

/**
 * Standardize defect description from T1QM / CFA raw string to standard category
 */
export const standardizeDefectName = (rawName) => {
  if (!rawName) return '';
  let str = String(rawName).trim().toUpperCase();
  if (!str || str === '-' || str === 'NONE') return '';

  // Remove trailing comma or punctuation
  str = str.replace(/,+$/, '').trim();

  // Numeric-only values are quantities typed into the name slot, not defects
  if (/^\d+$/.test(str)) return '';

  // Common typos seen in AQL / T1QM input
  str = str.replace(/COLL?OU?R/g, 'COLOR');

  // Fast direct match
  if (STANDARD_DEFECTS.includes(str)) return str;

  // Fuzzy / substring rules to standard categories
  if (str.includes('CONTAMINATION UPPER')) return 'CONTAMINATION UPPER';
  if (str.includes('CONTAM') || str.includes('STAIN')) return 'CONTAMINATION';
  if (str.includes('BONDING GAP')) return 'BONDING GAP';
  if (str.includes('BONDING') || str.includes('CEMENT OPEN')) return 'BONDING';
  if (str.includes('OVER CEM') || str.includes('OVERCEM') || str.includes('OVERFLOWING CEMENT') || str.includes('PRIMING')) return 'OVER CEMENTING';
  if ((str.includes('LINING') || str.includes('LINNING')) && (str.includes('WRINKLE') || str.includes('FOLD'))) return 'WRINKLE IN LINNING';
  // Outsole quality lists "WRINKLES" as an example; keep it out of POOR SHAPE/ WRINKLE
  if (str.includes('MID-/OUTSOLE QUALITY')) return str;
  if (str.includes('POOR SHAPE') || str.includes('WRINKLE') || str.includes('COLLAPSING')) return 'POOR SHAPE/ WRINKLE';
  if (str.includes('HOLES NOT PUNCHED') || str.includes('HOLE NOT PUNCHED')) return 'HOLES NOT PUNCHED PROPERLY';
  if (str.includes('DIFFERENT COLOR OUT SOLE') || str.includes('DIFFERENT COLOR OUTSOLE')) return 'DIFFERENT COLOR OUT SOLE';
  if (str.includes('COLOR DIFFEREN') || str.includes('DIFFERENT COLOR')) return 'COLOR DIFFERENCE';
  if (str.includes('MISS MATCHING COLOR OUTSOLE')) return 'MISS MATCHING COLOR OUTSOLE';
  if (str.includes('MIS-MATCHING') || str.includes('MISS MATCHING') || str.includes('MIS MATCHING') || str.includes('MISMATCH')) return 'MISS MATCHING';
  if (str.includes('DAMAGED O/S') || str.includes('DAMAGED OS') || str.includes('OUTSOLE DAMAGE') || str.includes('OUT SOLE DAMAGE')) return 'DAMAGED O/S';
  if (str.includes('DAMAGED MATERIAL') || str.includes('MATERIAL DAMAGE')) return 'DAMAGED MATERIAL';
  if (str.includes('POOR HAPTIC')) return 'POOR HAPTIC';
  if (str.includes('DAMAGED HEPTIC') || str.includes('DAMAGED HAPTIC')) return 'DAMAGED HEPTIC';
  if (str.includes('DEFOAM') || str.includes('DE-FOAM')) return 'DEFOAM';
  if (str.includes('INCONSISTENT OUTSOLE')) return 'INCONSISTENT OUTSOLE';
  if (str.includes('LACE DAMAGE') || str.includes('LACE TIP')) return 'LACE DAMAGE';
  if (str.includes('OFF CENTER') || str.includes('OFF-CENTER')) return 'OFF CENTER';
  if (str.includes('POOR DEFINITION')) return 'POOR DEFINITION';
  if (str.includes('POOR EYESTAY')) return 'POOR EYESTAY PUNCHY';
  if (str.includes('POOR POUNCHING') || str.includes('POOR PUNCHING')) return 'POOR POUNCHING';
  if (str.includes('PRESSING MARK')) return 'PRESSING MARKS';
  if (str.includes('THREAD END') || str.includes('LOOSE THREAD')) return 'THREAD ENDS';
  if (str.includes('YELLOWING') || str.includes('YELLOWISH')) return 'YELLOWING';
  if (str.includes('FRAYING')) return 'FRAYING';

  return str;
};

/**
 * Standardize Destination Category to REGULAR or CRITICAL
 */
export const standardizeDestinationCategory = (cat, dest = '', country = '') => {
  const combined = `${cat} ${dest} ${country}`.toUpperCase();
  if (combined.includes('CRITIC') || combined.includes('CRITICAL')) return 'CRITICAL';
  if (combined.includes('REGUL') || combined.includes('REGULAR') || combined.includes('REGULER')) return 'REGULAR';
  return 'REGULAR';
};

/**
 * Extract clean list of standardized defect names from row slots
 */
export const extractDefectList = (row, maxSlots = 25) => {
  const defects = [];
  for (let i = 1; i <= maxSlots; i++) {
    const raw = row[`defect_name_${i}`] || row[`defect_name${i}`] || row[`defect_${i}`] || '';
    const std = standardizeDefectName(raw);
    if (std) defects.push(std);
  }
  return defects;
};

// Number of T1QM defects per level compared against the CFA findings
export const T1QM_TOP_DEFECTS = 5;

/**
 * Top N standardized defect names across one or more inspection records,
 * ranked by summed QTY DEFECT (ties keep slot order).
 */
export const topDefectsByQty = (records = [], limit = T1QM_TOP_DEFECTS, maxSlots = 25) => {
  const totals = new Map(); // name -> { qty, order }
  records.forEach(row => {
    for (let i = 1; i <= maxSlots; i++) {
      const raw = row[`defect_name_${i}`] || row[`defect_name${i}`] || row[`defect_${i}`] || '';
      const name = standardizeDefectName(raw);
      if (!name) continue;
      const qty = parseNumber(row[`qty_defect_${i}`] ?? row[`qty_defect${i}`]);
      if (!totals.has(name)) totals.set(name, { qty: 0, order: totals.size });
      totals.get(name).qty += qty;
    }
  });
  return Array.from(totals.entries())
    .sort((a, b) => b[1].qty - a[1].qty || a[1].order - b[1].order)
    .slice(0, limit)
    .map(([name]) => name);
};

/**
 * Build joined dataset between CFA records and T1QM (1, 2, 3) records by PO
 */
export const buildCfaValidationDataset = (rawData = []) => {
  if (!Array.isArray(rawData) || rawData.length === 0) return [];

  const cfaRows = [];
  const t1qmRows = [];

  rawData.forEach(row => {
    const type = String(row.type_inspection || row.inspection_type || '').trim().toUpperCase().replace(/\s+/g, '');
    if (type === 'CFA') {
      // Skip rows whose only inspector is an excluded (test) name
      const rawName = String(row.cfa_name || row.inspector || '').trim();
      if (rawName && rawName !== '-' && splitCfaNames(rawName).length === 0) return;
      cfaRows.push(row);
    } else if (type === 'T1QM1' || type === 'T1QM2' || type === 'T1QM3') {
      t1qmRows.push(row);
    }
  });

  const normalizeKey = (v) => String(v || '').trim().toUpperCase().replace(/\s+/g, ' ');

  // Index CFA rows by PO; one PO can hold several AQL rows (different CFA / historical PO)
  const cfaIdxByPo = new Map();
  cfaRows.forEach((cfa, idx) => {
    const poKey = normalizeKey(cfa.po);
    if (!poKey) return;
    if (!cfaIdxByPo.has(poKey)) cfaIdxByPo.set(poKey, []);
    cfaIdxByPo.get(poKey).push(idx);
  });

  // AQL holds nicknames ("NISMA", "INA, PUTRI"), T1QM holds full names ("WAKHIDAH APRIANISMA").
  // 2 = whole-word match, 1 = substring match, 0 = no match
  const nameScore = (t1qmCfaName, aqlCfaName) => {
    const full = normalizeKey(t1qmCfaName);
    const words = full.split(' ');
    let best = 0;
    splitCfaNames(aqlCfaName).forEach(nick => {
      const aliases = CFA_NAME_ALIASES[nick] || [];
      if (nick === full || words.includes(nick) || aliases.some(a => words.includes(a))) best = 2;
      else if (best < 1 && (full.includes(nick) || nick.includes(full))) best = 1;
    });
    return best;
  };

  // Resolve each T1QM record to the specific AQL row(s) it validated:
  // PO first, then CFA NAME (a T1QM record naming a CFA who has no AQL row on that PO is
  // skipped), then HISTORYCAL PO. Legacy records without CFA NAME fall back to PO only.
  const emptyLevels = () => ({ 'T1QM 1': [], 'T1QM 2': [], 'T1QM 3': [] });
  const t1qmByCfaIdx = cfaRows.map(emptyLevels);
  t1qmRows.forEach(row => {
    let candidates = cfaIdxByPo.get(normalizeKey(row.po));
    if (!candidates) return;

    const t1qmCfaName = normalizeKey(row.cfa_name);
    if (t1qmCfaName && t1qmCfaName !== '-') {
      const scored = candidates.map(idx => ({ idx, score: nameScore(t1qmCfaName, cfaRows[idx].cfa_name || cfaRows[idx].inspector) }));
      const top = Math.max(...scored.map(s => s.score));
      if (top === 0) return;
      candidates = scored.filter(s => s.score === top).map(s => s.idx);
    }

    const histKey = normalizeKey(row.historycal_po || row.historical_po);
    if (histKey) {
      const byHist = candidates.filter(idx => normalizeKey(cfaRows[idx].historycal_po || cfaRows[idx].historical_po) === histKey);
      if (byHist.length > 0) candidates = byHist;
    }

    const typeNormalized = String(row.type_inspection || '').trim().toUpperCase().replace(/\s+/g, '');
    let levelKey = 'T1QM 1';
    if (typeNormalized.endsWith('2')) levelKey = 'T1QM 2';
    else if (typeNormalized.endsWith('3')) levelKey = 'T1QM 3';

    candidates.forEach(idx => t1qmByCfaIdx[idx][levelKey].push(row));
  });

  // Join CFA rows with T1QM 1, 2, 3
  const mergedDataset = cfaRows.map((cfa, cfaIdx) => {
    const po = String(cfa.po || '').trim();
    const t1qmRecords = t1qmByCfaIdx[cfaIdx];

    const cfaDefects = extractDefectList(cfa, 5);
    const cfaNameList = splitCfaNames(cfa.cfa_name || cfa.inspector);
    const cfaInspector = cfaNameList.join(', ') || '-';

    // Process each T1QM level
    const processT1qmLevel = (records) => {
      if (!records || records.length === 0) return null;
      // If multiple records for same level & PO, combine them
      let totalQtyInsp = 0;
      let totalQtyDef = 0;
      const allDefects = [];
      const inspectors = new Set();

      records.forEach(rec => {
        const qtyInsp = parseNumber(rec.qty_inspection);
        const qtyDef = parseNumber(rec.total_defect || rec.qty_defect);
        totalQtyInsp += qtyInsp;
        totalQtyDef += qtyDef;
        const insp = String(rec.inspector || '').trim();
        if (insp) inspectors.add(insp);

        const recDefects = extractDefectList(rec, 25);
        allDefects.push(...recDefects);
      });

      // Alignment compares only the top 5 T1QM defects (by QTY DEFECT) of this level
      const topDefects = topDefectsByQty(records);
      const matchCount = topDefects.filter(d => cfaDefects.includes(d)).length;
      const alignment = topDefects.length > 0 ? (matchCount / topDefects.length) : null;
      const passRate = totalQtyInsp > 0 ? Math.max(0, ((totalQtyInsp - totalQtyDef) / totalQtyInsp) * 100) : null;

      return {
        inspector: Array.from(inspectors).join(', ') || '-',
        inspectors: Array.from(inspectors),
        qtyInspection: totalQtyInsp,
        qtyDefect: totalQtyDef,
        passRate,
        defects: allDefects,
        topDefects,
        matchCount,
        alignment
      };
    };

    const t1qm1 = processT1qmLevel(t1qmRecords['T1QM 1']);
    const t1qm2 = processT1qmLevel(t1qmRecords['T1QM 2']);
    const t1qm3 = processT1qmLevel(t1qmRecords['T1QM 3']);

    // Combine all T1QM inspectors involved in this PO
    const allT1qmInspectors = new Set();
    [t1qm1, t1qm2, t1qm3].forEach(lvl => {
      if (lvl && lvl.inspectors) {
        lvl.inspectors.forEach(name => allT1qmInspectors.add(name));
      }
    });

    // Same as DEFECT ALIGNMENT sheet: AVERAGE of ALIGMENT T1QM1..T1QM3,
    // skipping levels that were not done or found no defect
    const levelAlignments = [t1qm1, t1qm2, t1qm3]
      .map(lvl => (lvl ? lvl.alignment : null))
      .filter(a => a !== null);
    const alignmentAvg = levelAlignments.length > 0
      ? levelAlignments.reduce((sum, a) => sum + a, 0) / levelAlignments.length
      : null;

    const destCategory = standardizeDestinationCategory(
      cfa.destination_category || cfa.category,
      cfa.destination,
      cfa.country
    );

    return {
      date: cfa.date || '',
      cfaName: cfaInspector,
      cfaNames: cfaNameList,
      historicalPo: String(cfa.historycal_po || cfa.historical_po || 'ANSI AQL').trim(),
      po,
      factory: cfa.factory || '',
      cell: cfa.cell || '',
      model: cfa.model || '',
      article: cfa.article || '',
      destination: cfa.destination || '',
      destinationCategory: destCategory,
      cfaDefects,
      t1qm1,
      t1qm2,
      t1qm3,
      t1qmInspectors: Array.from(allT1qmInspectors),
      alignmentAvg,
      hasT1qmValidation: Boolean(t1qm1 || t1qm2 || t1qm3)
    };
  });

  // Scope: only AQL inspections that T1QM has validated. Unvalidated CFA rows are left out
  // of every widget, filter option and count.
  return mergedDataset.filter(row => row.hasT1qmValidation);
};

/**
 * Filter dataset and compute aggregated metrics for all 6 widgets in Gambar 2
 */
export const calculateCfaValidationMetrics = (dataset = [], filters = {}) => {
  const {
    cfaNames = [],
    checkByT1qm = [],
    historicalPos = [],
    destinationCategory = 'ALL',
    startDate = 'ALL',
    endDate = 'ALL'
  } = filters;

  // Filter rows
  const filtered = dataset.filter(row => {
    // 1. CFA Name filter
    if (cfaNames.length > 0 && !row.cfaNames.some(name => cfaNames.includes(name))) return false;

    // 2. Check by T1QM filter
    if (checkByT1qm.length > 0) {
      const matchInsp = row.t1qmInspectors.some(insp => checkByT1qm.includes(insp));
      if (!matchInsp) return false;
    }

    // 3. Historical PO filter
    if (historicalPos.length > 0 && !historicalPos.includes(row.historicalPo)) return false;

    // 4. Destination Category filter
    if (destinationCategory !== 'ALL' && row.destinationCategory !== destinationCategory) return false;

    // 5. Date Range filter
    if (startDate !== 'ALL' || endDate !== 'ALL') {
      const rawDate = row.date;
      if (!rawDate) return false;
      let rowDate;
      if (rawDate.includes('/')) {
        const [d, m, y] = rawDate.split('/').map(Number);
        rowDate = new Date(y, m - 1, d);
      } else {
        rowDate = new Date(rawDate);
      }
      if (isNaN(rowDate.getTime())) return false;
      rowDate.setHours(0, 0, 0, 0);
      const rowTime = rowDate.getTime();

      if (startDate !== 'ALL') {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (rowTime < start.getTime()) return false;
      }
      if (endDate !== 'ALL') {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (rowTime > end.getTime()) return false;
      }
    }

    return true;
  });

  // ── WIDGET 1: PASSRATE (%) VALIDATION T1QM (T1QM 1, T1QM 2, T1QM 3) ──
  const t1qmStats = {
    'T1QM 1': { qtyInsp: 0, qtyDef: 0 },
    'T1QM 2': { qtyInsp: 0, qtyDef: 0 },
    'T1QM 3': { qtyInsp: 0, qtyDef: 0 }
  };

  filtered.forEach(row => {
    if (row.t1qm1) {
      t1qmStats['T1QM 1'].qtyInsp += row.t1qm1.qtyInspection;
      t1qmStats['T1QM 1'].qtyDef += row.t1qm1.qtyDefect;
    }
    if (row.t1qm2) {
      t1qmStats['T1QM 2'].qtyInsp += row.t1qm2.qtyInspection;
      t1qmStats['T1QM 2'].qtyDef += row.t1qm2.qtyDefect;
    }
    if (row.t1qm3) {
      t1qmStats['T1QM 3'].qtyInsp += row.t1qm3.qtyInspection;
      t1qmStats['T1QM 3'].qtyDef += row.t1qm3.qtyDefect;
    }
  });

  // Pass rate clamped to 0-100: a few T1QM records have TOTAL DEFECT > QTY INSPECTION,
  // which would otherwise give negative pass rates
  const passRatePct = (insp, def) => (
    insp > 0 ? Math.min(100, Math.max(0, Math.round(((insp - def) / insp) * 100))) : null
  );

  const getPassRate = (stats) => passRatePct(stats.qtyInsp, stats.qtyDef) ?? 0;

  const t1qmPassRates = [
    { name: 'T1QM 1', passRate: getPassRate(t1qmStats['T1QM 1']) },
    { name: 'T1QM 2', passRate: getPassRate(t1qmStats['T1QM 2']) },
    { name: 'T1QM 3', passRate: getPassRate(t1qmStats['T1QM 3']) }
  ];

  // ── WIDGET 2 & 3: PER CFA NAME PASS RATE & BREAKDOWN ──
  const cfaGroupMap = new Map();

  // A joint inspection (several CFA names in one AQL row) counts for each named CFA
  filtered.forEach(row => {
    const rowNames = row.cfaNames.length > 0 ? row.cfaNames : ['UNKNOWN'];
    const groupNames = cfaNames.length > 0 ? rowNames.filter(name => cfaNames.includes(name)) : rowNames;

    groupNames.forEach(cfa => {
      if (!cfaGroupMap.has(cfa)) {
        cfaGroupMap.set(cfa, {
          cfaName: cfa,
          t1_insp: 0, t1_def: 0,
          t2_insp: 0, t2_def: 0,
          t3_insp: 0, t3_def: 0,
          total_insp: 0, total_def: 0,
          regularCount: 0,
          criticalCount: 0,
          alignmentSum: 0,
          alignedRows: 0
        });
      }

      const g = cfaGroupMap.get(cfa);
      if (row.alignmentAvg !== null) {
        g.alignmentSum += row.alignmentAvg;
        g.alignedRows += 1;
      }

      // Destination counts
      if (row.destinationCategory === 'CRITICAL') {
        g.criticalCount += 1;
      } else {
        g.regularCount += 1;
      }

      // T1QM 1
      if (row.t1qm1) {
        g.t1_insp += row.t1qm1.qtyInspection;
        g.t1_def += row.t1qm1.qtyDefect;
        g.total_insp += row.t1qm1.qtyInspection;
        g.total_def += row.t1qm1.qtyDefect;
      }
      // T1QM 2
      if (row.t1qm2) {
        g.t2_insp += row.t1qm2.qtyInspection;
        g.t2_def += row.t1qm2.qtyDefect;
        g.total_insp += row.t1qm2.qtyInspection;
        g.total_def += row.t1qm2.qtyDefect;
      }
      // T1QM 3
      if (row.t1qm3) {
        g.t3_insp += row.t1qm3.qtyInspection;
        g.t3_def += row.t1qm3.qtyDefect;
        g.total_insp += row.t1qm3.qtyInspection;
        g.total_def += row.t1qm3.qtyDefect;
      }
    });
  });

  const cfaList = Array.from(cfaGroupMap.values()).sort((a, b) => a.cfaName.localeCompare(b.cfaName));

  // Table summary: CFA NAME vs PASS RATE (%)
  const cfaSummaryTable = cfaList.map(item => ({
    cfaName: item.cfaName,
    passRate: item.total_insp > 0 ? `${passRatePct(item.total_insp, item.total_def)}%` : '-'
  }));

  // Grouped Bar: Pass Rate T1QM 1, 2, 3 per CFA
  const cfaGroupedPassRates = cfaList.map(item => ({
    cfaName: item.cfaName,
    t1qm1: passRatePct(item.t1_insp, item.t1_def),
    t1qm2: passRatePct(item.t2_insp, item.t2_def),
    t1qm3: passRatePct(item.t3_insp, item.t3_def)
  }));

  // ── WIDGET 4 & 5: REGULAR VS CRITICAL DESTINATION ──
  let totalRegular = 0;
  let totalCritical = 0;

  filtered.forEach(row => {
    if (row.destinationCategory === 'CRITICAL') totalCritical++;
    else totalRegular++;
  });

  const destinationBarData = [
    { category: 'CRITICAL', count: totalCritical },
    { category: 'REGULAR', count: totalRegular }
  ];

  const destinationLineData = cfaList.map(item => ({
    cfaName: item.cfaName,
    regular: item.regularCount,
    critical: item.criticalCount
  }));

  // ── WIDGET 6: TOP 10 DEFECT FINDING BY T1QM (DONUT CHART) ──
  const defectCountMap = new Map();
  let totalT1qmDefectOccurrences = 0;

  filtered.forEach(row => {
    [row.t1qm1, row.t1qm2, row.t1qm3].forEach(lvl => {
      if (lvl && lvl.defects) {
        lvl.defects.forEach(d => {
          totalT1qmDefectOccurrences++;
          defectCountMap.set(d, (defectCountMap.get(d) || 0) + 1);
        });
      }
    });
  });

  const top10Defects = Array.from(defectCountMap.entries())
    .map(([name, count]) => ({
      name,
      count,
      percent: totalT1qmDefectOccurrences > 0 ? parseFloat(((count / totalT1qmDefectOccurrences) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ── WIDGET 7: DEFECT MATRIX VALIDATION BY T1QM (STACKED BAR 100%) ──
  // Match rate = average of each validated PO's T1QM 1-3 alignment average.
  // When T1QM found no defect on any of the CFA's POs, alignment is undefined, never 100%
  const defectMatrixData = cfaList.map(item => {
    if (item.alignedRows === 0) {
      return {
        cfaName: item.cfaName,
        status: 'NO T1QM DEFECT',
        matchRate: null,
        mismatchRate: null,
        noDefectRate: 100
      };
    }

    const matchRate = Math.round((item.alignmentSum / item.alignedRows) * 100);
    return {
      cfaName: item.cfaName,
      status: 'VALIDATED',
      alignedRows: item.alignedRows,
      matchRate,
      mismatchRate: 100 - matchRate,
      noDefectRate: null
    };
  });

  const sankeyFlowData = generateSankeyFlowData(filtered, 6);

  return {
    filteredRowsCount: filtered.length,
    t1qmPassRates,
    cfaSummaryTable,
    cfaGroupedPassRates,
    destinationBarData,
    destinationLineData,
    top10Defects,
    defectMatrixData,
    sankeyFlowData,
    filteredRows: filtered
  };
};

/**
 * Generate Directed Acyclic Graph (DAG) for Recharts Sankey Component:
 * Stage 1: Top CFA Defect Findings
 * Stage 2: T1QM Validation Level (T1QM 1, T1QM 2, T1QM 3)
 * Stage 3: Alignment Outcome (MATCH vs MIS-MATCH)
 */
export const generateSankeyFlowData = (rows = [], maxDefects = 6) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { nodes: [], links: [] };
  }

  // Count occurrences of each CFA defect
  const defectCounts = {};
  rows.forEach(r => {
    (r.cfaDefects || []).forEach(d => {
      defectCounts[d] = (defectCounts[d] || 0) + 1;
    });
  });

  const topDefects = Object.entries(defectCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxDefects)
    .map(e => e[0]);

  if (topDefects.length === 0) {
    return { nodes: [], links: [] };
  }

  const stage1Nodes = topDefects;
  const stage2Nodes = ['T1QM 1', 'T1QM 2', 'T1QM 3'];
  const stage3Nodes = ['MATCH (ALIGNED)', 'MIS-MATCH'];

  const allNodeNames = [...stage1Nodes, ...stage2Nodes, ...stage3Nodes];
  const nodeIndexMap = new Map();
  allNodeNames.forEach((n, idx) => nodeIndexMap.set(n, idx));

  const linkMap = {}; // 'sIdx-tIdx' => { source, target, value }

  const addLink = (sName, tName, val = 1) => {
    if (val <= 0) return;
    const sIdx = nodeIndexMap.get(sName);
    const tIdx = nodeIndexMap.get(tName);
    if (sIdx === undefined || tIdx === undefined) return;
    const key = `${sIdx}-${tIdx}`;
    if (!linkMap[key]) {
      linkMap[key] = { source: sIdx, target: tIdx, value: 0 };
    }
    linkMap[key].value += val;
  };

  rows.forEach(r => {
    const defects = (r.cfaDefects || []).filter(d => topDefects.includes(d));
    if (defects.length === 0) return;

    const levels = [
      { obj: r.t1qm1, nodeName: 'T1QM 1' },
      { obj: r.t1qm2, nodeName: 'T1QM 2' },
      { obj: r.t1qm3, nodeName: 'T1QM 3' }
    ];

    levels.forEach(lvl => {
      if (!lvl.obj || !lvl.obj.topDefects || lvl.obj.topDefects.length === 0) return;

      defects.forEach(d => {
        // Stage 1 -> Stage 2
        addLink(d, lvl.nodeName, 1);

        // Stage 2 -> Stage 3
        const isMatched = lvl.obj.topDefects.includes(d);
        if (isMatched) {
          addLink(lvl.nodeName, 'MATCH (ALIGNED)', 1);
        } else {
          addLink(lvl.nodeName, 'MIS-MATCH', 1);
        }
      });
    });
  });

  const links = Object.values(linkMap).filter(l => l.value > 0);
  const nodes = allNodeNames.map(name => ({ name }));

  return { nodes, links };
};
