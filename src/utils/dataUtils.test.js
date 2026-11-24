import assert from 'node:assert/strict';
import test from 'node:test';
import { TREND_DEFECT_GROUPS, computeTrendDefectRates, formatAxisPercent, trendPercentTicks, getInspectorType, groupTrendDefects, isUsablePhotoUrl, getT1qmInspectionTypes, getT1qmStatusCounts, isT1qmDateAnomaly, isT1qmType, matchesT1qmInspectionType, normalizeDefectName, parseNumber } from './dataUtils.js';

test('groups only the supported T1QM inspection types', () => {
  for (const type of ['T1QM 1', 'T1QM 2', 'T1QM 3']) {
    assert.equal(getInspectorType({ type_inspection: type }), 'T1QM');
  }

  assert.notEqual(getInspectorType({ type_inspection: 'T1QM validation' }), 'T1QM');
  assert.notEqual(getInspectorType({ type_inspection: 'T1QM 4' }), 'T1QM');
});

test('identifies the anomalous T1QM date without excluding neighboring dates', () => {
  assert.equal(isT1qmDateAnomaly('28/08/2008'), true);
  assert.equal(isT1qmDateAnomaly('2008-08-28'), true);
  assert.equal(isT1qmDateAnomaly('28/08/2026'), false);
  assert.equal(isT1qmDateAnomaly(''), false);
});

test('recognizes supported T1QM labels despite whitespace and case differences', () => {
  assert.equal(isT1qmType('t1qm 1'), true);
  assert.equal(isT1qmType('T1QM2'), true);
  assert.equal(isT1qmType('T1QM 3'), true);
  assert.equal(isT1qmType('T1QM validation'), false);
  assert.equal(isT1qmType('T1QM 4'), false);
});

test('lists and matches only selected official T1QM inspection types', () => {
  const rows = [
    { type_inspection: 'T1QM 2' },
    { type_inspection: 'T1QM 1' },
    { type_inspection: 'T1QM 2' },
    { type_inspection: 'T1QM 3' },
    { type_inspection: 'T1QM Validation' },
  ];

  assert.deepEqual(getT1qmInspectionTypes(rows), ['T1QM 1', 'T1QM 2', 'T1QM 3']);
  assert.equal(matchesT1qmInspectionType('T1QM 2', ['T1QM 2']), true);
  assert.equal(matchesT1qmInspectionType('T1QM2', ['T1QM 2']), true);
  assert.equal(matchesT1qmInspectionType('T1QM 1', ['T1QM 2']), false);
  assert.equal(matchesT1qmInspectionType('T1QM 3', []), true);
});

test('counts T1QM pass, fail, and missing statuses separately', () => {
  assert.deepEqual(getT1qmStatusCounts([
    { status_po: 'PASS' },
    { status_po: 'FAIL' },
    { status_po: '' },
    { status_po: 'UNKNOWN' },
  ]), { pass: 1, fail: 1, unknown: 2 });
});

test('normalizes T1QM defect labels across case and whitespace differences', () => {
  assert.equal(normalizeDefectName('  Poor   Shape '), 'POOR SHAPE');
  assert.equal(normalizeDefectName('poor shape'), 'POOR SHAPE');
});

test('does not parse digits embedded in image paths as defect quantities', () => {
  assert.equal(parseNumber('DATA_INSPECTION_Images/429368af.PHOTO4.022349.jpg'), 0);
  assert.equal(parseNumber('1.234'), 1234);
  assert.equal(parseNumber('1,5'), 1.5);
});
test('skips AppSheet photo links with an empty fileName', () => {
  const base = 'https://www.appsheet.com/template/gettablefileurl?appName=APP&tableName=DATA_INSPECTION&fileName=';
  assert.equal(isUsablePhotoUrl(base), false);
  assert.equal(isUsablePhotoUrl(`${base}DATA_INSPECTION_Images/a.PHOTO1.jpg`), true);
  assert.equal(isUsablePhotoUrl('/photos/2026/11/a.jpg'), true);
  assert.equal(isUsablePhotoUrl('-'), false);
  assert.equal(isUsablePhotoUrl(''), false);
});

test('groups contamination and over cementing as Soiling, bonding as Bonding', () => {
  const groups = groupTrendDefects([
    { name: 'CONTAMINATION (STAINS, CEMENT, etc.) (>2 dots, >=2mm)', value: 60 },
    { name: 'CONTAMINATON', value: 1 },
    { name: 'OVER CEMENTING OR PRIMING ( YELLOWING OR DISCOLORATION)', value: 39 },
    { name: 'OVERCEMENT', value: 5 },
    { name: 'OVERFLOWING CEMENT (>0.5MM)', value: 2 },
    { name: 'BONDING GAP (<=4mm)', value: 55 },
    { name: 'BONDING GAP (>4mm)', value: 70 },
    { name: 'BONDING GAP', value: 10 },
    { name: 'COMPONENTS DELAMINATION (>4mm length and depth)', value: 3 },
    { name: 'POOR CEMENTING SOCKLINER TO INSOLE BOARD', value: 4 },
  ]);
  assert.deepEqual(groups.map((g) => [g.label, g.total, g.items.length]), [['Soiling', 107, 5], ['Bonding', 135, 3]]);
  assert.equal(groups[1].items[0].name, 'BONDING GAP (>4mm)');
});

test('computes trend defect rate as qty defect / qty inspection', () => {
  const rates = computeTrendDefectRates([
    { name: 'CONTAMINATION (Stains)', value: 50 },
    { name: 'BONDING GAP (<=4mm)', value: 25 },
  ], 1000);
  assert.deepEqual(rates.map((r) => [r.label, r.qty, r.rate]), [['Soiling', 50, 5], ['Bonding', 25, 2.5]]);
  assert.deepEqual(computeTrendDefectRates([{ name: 'BONDING GAP', value: 3 }], 0).map((r) => r.rate), [0, 0]);
});

test('builds round percent ticks for the trend chart', () => {
  assert.deepEqual(trendPercentTicks(10.1), [0, 5, 10, 15]);
  assert.deepEqual(trendPercentTicks(1.6), [0, 0.5, 1, 1.5, 2]);
  assert.deepEqual(trendPercentTicks(0), [0, 0.05, 0.1, 0.15]);
  assert.equal(formatAxisPercent(0.25), '0,25%');
  assert.equal(formatAxisPercent(15), '15%');
});

test('trend groups follow the CFA defect filter lists (Bonding / Soiling)', () => {
  const groupOf = (name) => (TREND_DEFECT_GROUPS.find((g) => g.match(name)) || {}).key || null;
  ['BONDING', 'BONDING GAP', 'BONDING GAP (<=4mm)', 'BONDING GAP (>4mm)']
    .forEach((name) => assert.equal(groupOf(name), 'BONDING', name));
  [
    'CONTAMINATION', 'CONTAMINATION (STAINS, CEMENT, etc.) (<2 dots, <2mm)',
    'CONTAMINATION (Stains, printing mark) (<2 dots, <2mm)', 'CONTAMINATION (Stains, printing mark) (>2 dots, >=2mm)',
    'CONTAMINATION 3 STRIPES', 'CONTAMINATION BOTTOM (Stains) (<2 dots, <2mm)', 'CONTAMINATION O/S', 'CONTAMINTION',
    'OVER CEMENTING', 'OVER CEMENTING OR PRIMING (<4mm length, <2mm width)', 'OVERCEMENTING',
    'CONTAMNATION', 'CONTAMNATION O/S',
  ].forEach((name) => assert.equal(groupOf(name), 'SOILING', name));
  ['BEDA WARNA EYESTAY', 'DAMAGE MATERIAL', 'DELAMINATION NO SEW', 'OFF CENTER', 'PADING SHAPE']
    .forEach((name) => assert.equal(groupOf(name), null, name));
});
