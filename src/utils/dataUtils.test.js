import assert from 'node:assert/strict';
import test from 'node:test';
import { getInspectorType, getT1qmInspectionTypes, getT1qmStatusCounts, isT1qmDateAnomaly, isT1qmType, matchesT1qmInspectionType, normalizeDefectName, parseNumber } from './dataUtils.js';

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