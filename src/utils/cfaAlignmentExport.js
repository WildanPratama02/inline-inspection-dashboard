// Export the CFA vs T1QM validation rows in the layout of the DEFECT ALIGNMENT FINAL sheet
// (SpreadsheetML, same approach as excelExportUtils.js).

const escapeXml = (unsafe) => {
  return String(unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

// Column positions (1-based) of the reference sheet
const COL_CFA_DEFECT_FIRST = 14; // N..R
const LEVEL_START = { t1qm1: 19, t1qm2: 31, t1qm3: 43 }; // S, AE, AQ
const COL_MATCH_FIRST = 55; // BC
const TOTAL_COLS = 61; // BI
const HEADER_ROW = 4;
const FIRST_DATA_ROW = 5;

const LEVELS = [
  { key: 't1qm1', n: 1, label: 'T1QM 1', groupStyle: 'GroupT1', headStyle: 'HeadT1' },
  { key: 't1qm2', n: 2, label: 'T1QM 2', groupStyle: 'GroupT2', headStyle: 'HeadT2' },
  { key: 't1qm3', n: 3, label: 'T1QM 3', groupStyle: 'GroupT3', headStyle: 'HeadT3' }
];

// Excel character widths from the reference sheet, converted to points
const CHAR_WIDTHS = [
  16, 36, 23, 16, 16, 13, 7, 30, 16, 21, 28, 16, 16, // A..M
  20, 13, 13, 13, 20, // N..R
  ...[1, 2, 3].flatMap(() => [13.5, 19, 11.5, 12.5, 13, 11.5, 20, 13, 13, 13, 13, 22]), // S..BB
  15, 12.5, 13, 13, 13, 13, 13 // BC..BI
];
const toPoints = (chars) => Math.round((chars * 7 + 5) * 0.75);

const border = (color = '#000000') => `
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${color}"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${color}"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${color}"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${color}"/>
   </Borders>`;

const headerStyle = (id, fill, fontColor) => `
  <Style ss:ID="${id}">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="${fontColor}" ss:Bold="1"/>
   ${fill ? `<Interior ss:Color="${fill}" ss:Pattern="Solid"/>` : '<Interior/>'}${border()}
  </Style>`;

const dataStyle = (id, extra = '') => `
  <Style ss:ID="${id}">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>${border('#BFBFBF')}
   ${extra}
  </Style>`;

const STYLES = `
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  ${headerStyle('GroupCFA', '#002060', '#FFFFFF')}
  ${headerStyle('GroupT1', '#00B050', '#FFFFFF')}
  ${headerStyle('GroupT2', '#F1C232', '#000000')}
  ${headerStyle('GroupT3', '#E69138', '#000000')}
  ${headerStyle('HeadCFA', '#073763', '#FFFFFF')}
  ${headerStyle('HeadT1', '#6AA84F', '#FFFFFF')}
  ${headerStyle('HeadT2', '#F1C232', '#000000')}
  ${headerStyle('HeadT3', '#E69138', '#000000')}
  ${headerStyle('HeadCalc', '', '#000000')}
  ${dataStyle('Cell')}
  ${dataStyle('CellText', '<NumberFormat ss:Format="@"/>')}
  ${dataStyle('CellDate', '<NumberFormat ss:Format="dd/mm/yyyy"/>')}
  ${dataStyle('CellPct', '<NumberFormat ss:Format="0%"/>')}
  ${dataStyle('CellPctBold', '<Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/><NumberFormat ss:Format="0%"/>')}
 </Styles>`;

// "dd/mm/yyyy" (sheet format) or ISO -> SpreadsheetML DateTime, null if unparsable
const toExcelDate = (raw) => {
  const str = String(raw || '').trim();
  if (!str) return null;
  let y; let m; let d;
  if (str.includes('/')) {
    [d, m, y] = str.split('/').map(Number);
  } else {
    const parsed = new Date(str);
    if (isNaN(parsed.getTime())) return null;
    [y, m, d] = [parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate()];
  }
  if (!y || !m || !d) return null;
  const pad = (v) => String(v).padStart(2, '0');
  return `${y}-${pad(m)}-${pad(d)}T00:00:00.000`;
};

const cell = (index, style, value, type = 'String') => {
  if (value === null || value === undefined || value === '') {
    return `<Cell ss:Index="${index}" ss:StyleID="${style}"/>`;
  }
  return `<Cell ss:Index="${index}" ss:StyleID="${style}"><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
};

const formulaCell = (index, style, formula) => (
  `<Cell ss:Index="${index}" ss:StyleID="${style}" ss:Formula="${escapeXml(formula)}"/>`
);

const dateCell = (index, raw) => {
  const iso = toExcelDate(raw);
  return iso ? cell(index, 'CellDate', iso, 'DateTime') : cell(index, 'Cell', raw);
};

const numberCell = (index, value) => (
  value || value === 0 ? cell(index, 'Cell', value, 'Number') : cell(index, 'Cell', '')
);

// R1C1 range of the current row, absolute columns
const rowRange = (from, to) => `RC${from}:RC${to}`;

const buildLevelCells = (level, data) => {
  const b = LEVEL_START[level.key];
  if (!data) {
    return Array.from({ length: 12 }, (_, i) => cell(b + i, 'Cell', '')).join('');
  }
  const top = data.topDefects || [];
  return [
    cell(b, 'Cell', level.label),
    numberCell(b + 1, data.qtyInspection),
    numberCell(b + 2, data.qtyDefect),
    formulaCell(b + 3, 'CellPct', `=IF(RC${b + 1}>0,RC${b + 2}/RC${b + 1},"")`),
    formulaCell(b + 4, 'CellPct', `=IF(RC${b + 1}>0,(RC${b + 1}-RC${b + 2})/RC${b + 1},"")`),
    cell(b + 5, 'Cell', data.result),
    ...[0, 1, 2, 3, 4].map(i => cell(b + 6 + i, 'Cell', top[i] || '')),
    cell(b + 11, 'Cell', data.inspector && data.inspector !== '-' ? data.inspector : '')
  ].join('');
};

// Same formulas as the reference: RUMUS MATCH counts CFA findings found in T1QM,
// ALIGMENT = T1QM top-5 findings also found by CFA / T1QM findings listed
const buildCalcCells = () => {
  const cfaRange = rowRange(COL_CFA_DEFECT_FIRST, COL_CFA_DEFECT_FIRST + 4);
  const cells = [];
  LEVELS.forEach((level, i) => {
    const b = LEVEL_START[level.key];
    const t1Range = rowRange(b + 6, b + 10);
    const col = COL_MATCH_FIRST + i * 2;
    cells.push(formulaCell(col, 'Cell', `=SUMPRODUCT(--ISNUMBER(MATCH(${cfaRange},${t1Range},0)))`));
    cells.push(formulaCell(col + 1, 'CellPct',
      `=IF(COUNTA(${t1Range})=0,"",SUMPRODUCT(--ISNUMBER(MATCH(${t1Range},${cfaRange},0)))/COUNTA(${t1Range}))`));
  });
  const alignCols = [0, 1, 2].map(i => `RC${COL_MATCH_FIRST + i * 2 + 1}`).join(',');
  cells.push(formulaCell(TOTAL_COLS, 'CellPctBold', `=IFERROR(AVERAGE(${alignCols}),"")`));
  return cells.join('');
};

const buildDataRow = (row) => {
  const levelData = LEVELS.map(level => row[level.key]).filter(Boolean);
  // PO details only exist on the T1QM side (DATA INSPECTION)
  const firstLevel = levelData[0] || {};
  const defects = row.cfaDefects || [];

  return `   <Row ss:Height="30">
    ${dateCell(1, row.date)}${cell(2, 'Cell', row.cfaFullName || row.cfaName)}${cell(3, 'Cell', row.historicalPo)}${cell(4, 'CellText', row.po)}${numberCell(5, firstLevel.qtyOrder)}${cell(6, 'Cell', firstLevel.partialQty)}${cell(7, 'Cell', row.cell)}${cell(8, 'Cell', row.model)}${cell(9, 'Cell', row.article)}${cell(10, 'Cell', row.country)}${cell(11, 'Cell', row.destination)}${dateCell(12, row.podd)}${dateCell(13, firstLevel.crd)}
    ${[0, 1, 2, 3, 4].map(i => cell(COL_CFA_DEFECT_FIRST + i, 'Cell', defects[i] || '')).join('')}
    ${LEVELS.map(level => buildLevelCells(level, row[level.key])).join('\n    ')}
    ${buildCalcCells()}
   </Row>\n`;
};

const buildHeaderRows = () => {
  // Row 3: group labels over the defect-finding blocks
  const groupRow = [
    `<Cell ss:Index="${COL_CFA_DEFECT_FIRST}" ss:MergeAcross="4" ss:StyleID="GroupCFA"><Data ss:Type="String">CFA</Data></Cell>`,
    ...LEVELS.map(level => (
      `<Cell ss:Index="${LEVEL_START[level.key] + 6}" ss:MergeAcross="5" ss:StyleID="${level.groupStyle}"><Data ss:Type="String">${level.label}</Data></Cell>`
    ))
  ].join('');

  const cfaHeads = [
    'DATE', 'CFA NAME', 'HISTORYCAL PO', '#PO NUM.', 'QTY PO&#10;(Pairs)', 'PARTIAL OF &#10;QTY PO',
    'FACTORY-&#10;CELL', 'MODEL NAME', 'ARTICLE', 'COUNTRY', 'DESTINATION', 'PODD', 'CRD',
    'DEFECT FINDING 1', 'DEFECT FINDING 2', 'DEFECT FINDING 3', 'DEFECT FINDING 4', 'DEFECT FINDING 5'
  ];
  const levelHeads = (n) => [
    `VALIDATION&#10;T1QM ${n}`, `QTY INSPECTION ${n}&#10;(Pairs)`, `QTY&#10;DEFECT ${n}`,
    `DEFECT&#10;RATE (%) ${n}`, `PASS&#10;RATE (%) ${n}`, `RESULT ${n}`,
    ...[1, 2, 3, 4, 5].map(i => `DEFECT FINDING ${n}-${i}`), `CHECK BY &#10;T1QM ${n}`
  ];
  const calcHeads = [
    'RUMUS MATCH T1QM1', 'ALIGMENT &#10;T1QM1', 'RUMUS MATCH T1QM2', 'ALIGMENT &#10;T1QM2',
    'RUMUS MATCH T1QM3', 'ALIGMENT &#10;T1QM3', 'AVERAGE'
  ];
  // Header text is pre-escaped (&#10; line breaks), so it is written as-is
  const head = (style, text) => `<Cell ss:StyleID="${style}"><Data ss:Type="String">${text}</Data></Cell>`;
  const headerRow = [
    ...cfaHeads.map(text => head('HeadCFA', text)),
    ...LEVELS.flatMap(level => levelHeads(level.n).map(text => head(level.headStyle, text))),
    ...calcHeads.map(text => head('HeadCalc', text))
  ].join('');

  return `   <Row ss:Height="15.75"/>
   <Row ss:Height="15.75"/>
   <Row ss:Height="49.5">${groupRow}</Row>
   <Row ss:Height="69">${headerRow}</Row>\n`;
};

const dateSortKey = (date) => {
  const [d, m, y] = String(date || '').split('/');
  return y && m && d ? `${y}${m.padStart(2, '0')}${d.padStart(2, '0')}` : String(date || '');
};

// Rows are written sorted by inspection date, then CFA name
export const exportCfaAlignmentExcel = (inputRows = [], filename = 'DEFECT_ALIGNMENT.xls') => {
  const rows = [...inputRows].sort((a, b) => (
    dateSortKey(a.date).localeCompare(dateSortKey(b.date)) || String(a.cfaName).localeCompare(String(b.cfaName))
  ));
  const lastRow = FIRST_DATA_ROW + rows.length - 1;
  const columns = CHAR_WIDTHS.map(w => `<Column ss:Width="${toPoints(w)}"/>`).join('\n   ');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">${STYLES}
 <Worksheet ss:Name="DEFECT ALIGNMENT FINAL">
  <Table ss:ExpandedColumnCount="${TOTAL_COLS}" x:FullColumns="1" x:FullRows="1">
   ${columns}
${buildHeaderRows()}${rows.map(buildDataRow).join('')}  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitHorizontal>${HEADER_ROW}</SplitHorizontal>
   <TopRowBottomPane>${HEADER_ROW}</TopRowBottomPane>
   <ActivePane>2</ActivePane>
  </WorksheetOptions>
  <AutoFilter x:Range="R${HEADER_ROW}C1:R${Math.max(lastRow, HEADER_ROW)}C${TOTAL_COLS}" xmlns="urn:schemas-microsoft-com:office:excel"/>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
