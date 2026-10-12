export const normalizeKey = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const T1QM_TYPES = new Set(['T1QM1', 'T1QM2', 'T1QM3']);

export const normalizeT1qmType = (value) => {
  const normalized = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  return T1QM_TYPES.has(normalized) ? `T1QM ${normalized.slice(-1)}` : '';
};

export const isT1qmType = (value) => Boolean(normalizeT1qmType(value));

export const getT1qmInspectionTypes = (rows = []) => [...new Set(rows
  .map((row) => {
    const typeKey = findKey(row, 'type_inspection', 'type inspection');
    return typeKey ? normalizeT1qmType(row[typeKey]) : '';
  })
  .filter(Boolean))].sort();

export const matchesT1qmInspectionType = (type, selectedTypes = []) => (
  selectedTypes.length === 0 || selectedTypes.includes(normalizeT1qmType(type))
);

export const normalizeDefectName = (value) => String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();

export const isT1qmDateAnomaly = (value) => {
  const date = String(value || '').trim();
  if (date === '2008-08-28') return true;

  const match = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return Boolean(match && Number(match[1]) === 28 && Number(match[2]) === 8 && Number(match[3]) === 2008);
};

export const findKey = (item, ...searchTerms) => {
  if (!item) return null;

  const entries = Object.keys(item).map((key) => ({
    key,
    normalized: normalizeKey(key)
  }));

  // 1. Exact match first across search terms
  for (const term of searchTerms) {
    const normalizedTerm = normalizeKey(term);
    const match = entries.find((entry) => entry.normalized === normalizedTerm);
    if (match) return match.key;
  }

  // 2. Starts with / prefix match
  for (const term of searchTerms) {
    const normalizedTerm = normalizeKey(term);
    const match = entries.find((entry) => entry.normalized.startsWith(normalizedTerm));
    if (match) return match.key;
  }

  // 3. Substring includes match
  for (const term of searchTerms) {
    const normalizedTerm = normalizeKey(term);
    const match = entries.find((entry) => entry.normalized.includes(normalizedTerm));
    if (match) return match.key;
  }

  return null;
};

export const getT1qmStatusCounts = (rows = []) => {
  const counts = { pass: 0, fail: 0, unknown: 0 };

  rows.forEach((row) => {
    const statusKey = findKey(row, 'status_po', 'status inspection', 'status');
    const status = String((statusKey && row[statusKey]) || '').trim().toUpperCase();

    if (status.includes('FAIL') || status.includes('REJECT') || status === 'F') counts.fail++;
    else if (status.includes('PASS') || status.includes('APPROV') || status === 'P') counts.pass++;
    else counts.unknown++;
  });

  return counts;
};

export const parseNumber = (value) => {
  if (value === null || value === undefined) return 0;

  const source = String(value).trim();
  if (/[a-z]/i.test(source)) return 0;

  const normalized = source
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.-]/g, '');

  if (!normalized) return 0;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const parsePercent = (value) => {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str || str === '-' || str === 'NO DATA') return null;

  const cleaned = str.replace(/,/g, '.').replace(/[^\d.-]/g, '');
  if (!cleaned) return null;

  let parsed = parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return null;

  if (parsed > 0 && parsed <= 1 && !str.includes('%')) {
    parsed = parsed * 100;
  }

  return parsed;
};

export const toLocalISODate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const formatDateStr = (dateStr) => {
  if (!dateStr || dateStr === 'ALL') return '';
  const parts = String(dateStr).split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
  }
  return dateStr;
};

export const getWeekStart = (dateStr) => {
  if (!dateStr) return '';

  let d;
  if (String(dateStr).includes('/')) {
    const [day, month, year] = String(dateStr).split('/').map(Number);
    d = new Date(year, month - 1, day);
  } else {
    d = new Date(dateStr);
  }

  if (isNaN(d.getTime())) return '';
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return toLocalISODate(monday);
};

export const getWeekLabel = (weekStartStr) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  let start;
  if (String(weekStartStr).includes('/')) {
    const [day, month, year] = String(weekStartStr).split('/').map(Number);
    start = new Date(year, month - 1, day);
  } else {
    start = new Date(weekStartStr);
  }

  if (isNaN(start.getTime())) return weekStartStr;

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.getDate()} ${months[start.getMonth()]} - ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;
};

// Static inspector-type mapping
export const INSPECTOR_TYPE_MAP = {
  'SHAHRUKH': '3rd Party',
  'NIKHIL DEEP': '3rd Party',
  'LAKSHYA SHARMA': '3rd Party',
  'GURUCHARAN YADAV': '3rd Party',
  'SATGURU PRASAD': '3rd Party',
  'NARESHKUMAR JAYARAMAN': '3rd Party',
  'PARASURAM': '3rd Party',
  'ASHUTOSH': '3rd Party',
  'MANPREET BAKSHI': '3rd Party',
  'DANISH QAMAR': '3rd Party',
  'RIZKY DWI': '3rd Party',
  'DAVESH': '3rd Party',
  'ILHAM': '3rd Party',
  'FADZAL': '3rd Party',
  'NIRMAL': '3rd Party',
  'SUMAN': '3rd Party',
  'BOYKE FERDIAN': '3rd Party',
  'AGISTA RANZA ANJARI': 'PSI LV.2',
  'HILHAM MUAZAM AUDA': 'PSI LV.2',
  'AZZI FATHURIHMAN': 'PSI LV.2',
  'RIVDA NOOR MAULIDYA': 'PSI LV.2',
  'ARUN': '3rd Party',
  'HARIS': '3rd Party',
  'M. ARIF SIDDIQ': '3rd Party',
  'SEPTI': '3rd Party',
  'MUNINDRA': '3rd Party',
  'IDA NUR MALLA': 'PSI LV.2',
  'UUN SEFTY WIDYA ASTUTI': 'PSI LV.2',
  'NOOR ROKHMAH': 'PSI LV.2',
  'AZIZAH': 'PSI LV.2',
  'ADRY RIZKI': '3rd Party',
  'SHIVAM JADON': '3rd Party',
  'DEEPAK': '3rd Party',
  'REKA ARIBOWO': 'PSI LV.2',
  'DADAN KHUSNUDZAN': '3rd Party',
  'ARIF SIDDIQ': '3rd Party',
  'NIKHIL': '3rd Party',
  'ILHAM': '3rd Party',
  'NIRMAL': '3rd Party',
  'SATGURU PRASAD': '3rd Party',
  'MANPREET BAKSHI': '3rd Party',
  'LAKSHYA SHARMA': '3rd Party',
  'SHAHRUKH': '3rd Party',
  'NIKHIL DEEP': '3rd Party',
};

export const getInspectorType = (inspectorName, item) => {
  let targetItem = null;
  let nameStr = null;

  if (typeof inspectorName === 'object' && inspectorName !== null) {
    targetItem = inspectorName;
  } else {
    nameStr = inspectorName;
    if (typeof item === 'object' && item !== null) {
      targetItem = item;
    }
  }

  // 1. Check direct sheet column if available (e.g., type_inspection, type inspection, inspection_type, inspector_type, etc.)
  if (targetItem) {
    const typeKey = findKey(
      targetItem,
      'type_inspection',
      'type inspection',
      'inspection_type',
      'inspector_type',
      'type_inspector',
      'type'
    );

    if (typeKey && targetItem[typeKey] && String(targetItem[typeKey]).trim() !== '' && String(targetItem[typeKey]).trim() !== '-') {
      const val = String(targetItem[typeKey]).trim().toUpperCase();
      if (isT1qmType(val)) return 'T1QM';
      if (val.replace(/\s+/g, '').startsWith('T1QM')) return null;
      // Exact CFA match / CFA check
      if (val.includes('CFA')) return 'CFA';
      // Exact PSI or PSI LV.1 / LV.2 match
      if (val === 'PSI LV.1' || val.includes('PSI LV.1') || val.includes('PSI LV. 1') || val.includes('PSI LV1')) return 'PSI LV.1';
      if (val === 'PSI' || val.includes('PSI LV.2') || val.includes('PSI LV. 2') || val.includes('PSI LV2')) return 'PSI LV.2';
      // AQL 3rd Party variants: "AQL3rd Party", "AQL 3rd Party", "3rd Party", etc.
      if (val.includes('AQL') || val.includes('3RD PARTY') || val.includes('3R PARTY')) return '3rd Party';
      // Return 100% Inline directly or other types directly so they don't fall through to static lookup
      return '100% Inline';
    }

    if (!nameStr) {
      const inspKey = findKey(targetItem, 'inspector', 'inspector_name', 'name');
      if (inspKey) nameStr = targetItem[inspKey];
    }
  }

  // 2. Fallback to inspector name lookup in static map
  if (!nameStr) return null;
  const normalized = String(nameStr).trim().toUpperCase();
  return INSPECTOR_TYPE_MAP[normalized] || null;
};
