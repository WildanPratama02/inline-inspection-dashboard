import { findKey, parseNumber, parsePercent } from './dataUtils.js';

const escapeXml = (unsafe) => {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

export const exportToExcelRFT = (data = [], rawData = [], resolveInspectorType, filename = 'Summary_RFT_Export.xls') => {
  const dataset = data && data.length > 0 ? data : rawData || [];
  const firstItem = dataset[0] || (rawData && rawData[0]) || {};

  const dateKey = findKey(firstItem, 'date', 'tgl', 'tanggal') || 'date';
  const inspectorKey = findKey(firstItem, 'inspector', 'inspector_name', 'name') || 'inspector';
  const poKey = findKey(firstItem, 'po') || 'po';
  const statusKey = findKey(firstItem, 'status_po', 'status po', 'status_inspection', 'status inspection', 'status', 'result', 'pass_fail');
  const articleKey = findKey(firstItem, 'article', 'article_no', 'art') || 'article';
  const modelKey = findKey(firstItem, 'model', 'style') || 'model';
  const qtyOrderKey = findKey(firstItem, 'qty_order', 'qty order', 'order_qty', 'order qty', 'qty') || 'qty_order';
  const destinationKey = findKey(firstItem, 'destination', 'dest') || 'destination';
  const qtyInsKey = findKey(firstItem, 'qty_inspection', 'qty inspection', 'qty_checking', 'qty checking', 'checking') || 'qty_inspection';
  const aGradeKey = findKey(firstItem, 'total_a_grade', 'total a grade', 'a_grade', 'a grade', 'a-grade', 'grade_a', 'grade a') || 'total_a_grade';
  const bGradeKey = findKey(firstItem, 'total_b_grade', 'total b grade', 'b_grade', 'b grade', 'b-grade', 'grade_b', 'grade b') || 'total_b_grade';
  const cGradeKey = findKey(firstItem, 'total_c_grade', 'total c grade', 'c_grade', 'c grade', 'c-grade', 'grade_c', 'grade c') || 'total_c_grade';
  const totalDefectKey = findKey(firstItem, 'total_defect', 'total defect', 'qty_defect', 'defect') || 'total_defect';
  const rftKey = findKey(firstItem, 'rft');

  // Categories & sheet names (hasStatusPo indicates if Status PO column should be added)
  const categories = [
    { sheetName: 'AQL CFA', type: 'CFA', hasStatusPo: true },
    { sheetName: 'PSI LV.1', type: 'PSI LV.1', hasStatusPo: false },
    { sheetName: 'PSI LV.2', type: 'PSI LV.2', hasStatusPo: false },
    { sheetName: 'AQL 3rd PARTY', type: '3rd Party', hasStatusPo: true },
    { sheetName: 'T1QM 1', type: 'T1QM 1', hasStatusPo: true },
    { sheetName: 'T1QM 2', type: 'T1QM 2', hasStatusPo: true },
    { sheetName: 'T1QM 3', type: 'T1QM 3', hasStatusPo: true }
  ];

  // Build SpreadsheetML XML
  let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#160B3B" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
  </Style>
  <Style ss:ID="HeaderCFA">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1E40AF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#1E40AF"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
  </Style>
  <Style ss:ID="HeaderPSI">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#047857" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#047857"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
  </Style>
  <Style ss:ID="Header3rdParty">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#6D28D9" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#6D28D9"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
  </Style>
  <Style ss:ID="HeaderT1QM">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#D97706" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#D97706"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
  </Style>

  <Style ss:ID="Cell">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellRight">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>

  <!-- Cell Styles with Section Left Boundaries & Colors -->
  <Style ss:ID="CellCFALeft">
   <Alignment ss:Vertical="Center"/>
   <Interior ss:Color="#EFF6FF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#1E40AF"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="CellPSILeft">
   <Alignment ss:Vertical="Center"/>
   <Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#047857"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="Cell3rdPartyLeft">
   <Alignment ss:Vertical="Center"/>
   <Interior ss:Color="#F5F3FF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#6D28D9"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="CellT1QMLeft">
   <Alignment ss:Vertical="Center"/>
   <Interior ss:Color="#FFFBEB" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#D97706"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
 </Styles>
`;

  // --- Sheets 1 - 5: AQL CFA, PSI LV.1, PSI LV.2, AQL 3rd PARTY, T1QM ---
  categories.forEach(cat => {
    // Filter data rows for this inspection type
    const rows = dataset.filter(item => {
      const inspName = String(item[inspectorKey] || '').trim();
      const iType = resolveInspectorType ? resolveInspectorType(inspName, item) : null;
      return iType === cat.type;
    });

    xml += ` <Worksheet ss:Name="${escapeXml(cat.sheetName)}">
  <Table>
   <Row ss:Height="25" ss:StyleID="Header">
    <Cell><Data ss:Type="String">${cat.type === 'CFA' ? 'Inspection Date' : 'Date'}</Data></Cell>
    <Cell><Data ss:Type="String">Inspector Name</Data></Cell>
    <Cell><Data ss:Type="String">PO</Data></Cell>
    <Cell><Data ss:Type="String">Article</Data></Cell>
    <Cell><Data ss:Type="String">Model</Data></Cell>
    <Cell><Data ss:Type="String">Qty Order</Data></Cell>
    <Cell><Data ss:Type="String">${cat.type === 'CFA' ? 'Finish Prod' : 'Destination'}</Data></Cell>
    <Cell><Data ss:Type="String">Qty Checking</Data></Cell>
    <Cell><Data ss:Type="String">Total A-Grade</Data></Cell>
    <Cell><Data ss:Type="String">Total B-Grade</Data></Cell>
    <Cell><Data ss:Type="String">Total C-Grade</Data></Cell>
    <Cell><Data ss:Type="String">Total Defect</Data></Cell>
    <Cell><Data ss:Type="String">RFT</Data></Cell>
    ${cat.hasStatusPo ? '<Cell><Data ss:Type="String">Status PO</Data></Cell>' : ''}
   </Row>\n`;

    rows.forEach(item => {
      const dateVal = item[dateKey] ? String(item[dateKey]).trim() : '-';
      const inspectorVal = item[inspectorKey] ? String(item[inspectorKey]).trim() : '-';
      const poVal = item[poKey] ? String(item[poKey]).trim() : '-';

      let statusPoVal = '-';
      if (statusKey && item[statusKey] !== undefined && item[statusKey] !== null && item[statusKey] !== '') {
        const s = String(item[statusKey]).trim().toUpperCase();
        if (s.includes('FAIL') || s.includes('REJECT') || s === 'F') {
          statusPoVal = 'FAIL';
        } else if (s.includes('PASS') || s.includes('APPROV') || s === 'P') {
          statusPoVal = 'PASS';
        } else {
          statusPoVal = String(item[statusKey]).trim();
        }
      } else {
        const qtyIns = qtyInsKey ? parseNumber(item[qtyInsKey]) : 0;
        const totalDef = totalDefectKey ? parseNumber(item[totalDefectKey]) : 0;
        const calcRft = qtyIns > 0 ? ((qtyIns - totalDef) / qtyIns) * 100 : 100;
        statusPoVal = calcRft >= 100 ? 'PASS' : 'FAIL';
      }

      const articleVal = articleKey && item[articleKey] !== undefined ? String(item[articleKey]).trim() : '-';
      const modelVal = modelKey && item[modelKey] !== undefined ? String(item[modelKey]).trim() : '-';
      const qtyOrderVal = qtyOrderKey ? parseNumber(item[qtyOrderKey]) : 0;
      const destinationVal = destinationKey && item[destinationKey] !== undefined ? String(item[destinationKey]).trim() : '-';
      const qtyCheckingVal = qtyInsKey ? parseNumber(item[qtyInsKey]) : 0;
      const totalAGradeVal = aGradeKey ? parseNumber(item[aGradeKey]) : 0;
      const totalBGradeVal = bGradeKey ? parseNumber(item[bGradeKey]) : 0;
      const totalCGradeVal = cGradeKey ? parseNumber(item[cGradeKey]) : 0;
      const totalDefectVal = totalDefectKey ? parseNumber(item[totalDefectKey]) : 0;

      let rftVal = null;
      if (type === 'PSI LV.1' || type === 'PSI LV.2') {
        if (qtyCheckingVal > 0) {
          rftVal = (totalAGradeVal / qtyCheckingVal) * 100;
        } else {
          rftVal = 0;
        }
      } else {
        if (rftKey) rftVal = parsePercent(item[rftKey]);
        if (rftVal === null) {
          if (qtyCheckingVal > 0) {
            rftVal = ((qtyCheckingVal - totalDefectVal) / qtyCheckingVal) * 100;
          } else {
            rftVal = 0;
          }
        }
      }
      const rftStr = `${rftVal.toFixed(1).replace('.', ',')}%`;

      xml += `   <Row ss:Height="20">
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(dateVal)}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${escapeXml(inspectorVal)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(poVal)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(articleVal)}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${escapeXml(modelVal)}</Data></Cell>
    <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${qtyOrderVal}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(destinationVal)}</Data></Cell>
    <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${qtyCheckingVal}</Data></Cell>
    <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${totalAGradeVal}</Data></Cell>
    <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${totalBGradeVal}</Data></Cell>
    <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${totalCGradeVal}</Data></Cell>
    <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${totalDefectVal}</Data></Cell>
    <Cell ss:StyleID="CellRight"><Data ss:Type="String">${escapeXml(rftStr)}</Data></Cell>
    ${cat.hasStatusPo ? `<Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(statusPoVal)}</Data></Cell>` : ''}
   </Row>\n`;
    });

    xml += `  </Table>
 </Worksheet>\n`;
  });

  // --- Sheet 5: SUMMARY INSPECTION ---
  const summaryPoGroups = {};
  dataset.forEach(item => {
    const rawPo = item[poKey];
    if (!rawPo || String(rawPo).trim() === '' || String(rawPo).trim() === '-') return;
    const poStr = String(rawPo).trim();

    if (!summaryPoGroups[poStr]) {
      summaryPoGroups[poStr] = [];
    }
    summaryPoGroups[poStr].push(item);
  });

  xml += ` <Worksheet ss:Name="SUMMARY INSPECTION">
  <Table>
   <Row ss:Height="25">
    <Cell ss:StyleID="Header"><Data ss:Type="String">INSPECTION DATE</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">PO</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">ARTICLE</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">MODEL</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">DESTINATION</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">QTY ORDER</Data></Cell>

    <Cell ss:StyleID="HeaderCFA"><Data ss:Type="String">CFA NAME</Data></Cell>
    <Cell ss:StyleID="HeaderCFA"><Data ss:Type="String">QTY CHECKING</Data></Cell>
    <Cell ss:StyleID="HeaderCFA"><Data ss:Type="String">TOTAL DEFECT</Data></Cell>
    <Cell ss:StyleID="HeaderCFA"><Data ss:Type="String">RFT</Data></Cell>

    <Cell ss:StyleID="HeaderPSI"><Data ss:Type="String">PSI LV.1 NAME</Data></Cell>
    <Cell ss:StyleID="HeaderPSI"><Data ss:Type="String">QTY CHECKING</Data></Cell>
    <Cell ss:StyleID="HeaderPSI"><Data ss:Type="String">TOTAL DEFECT</Data></Cell>
    <Cell ss:StyleID="HeaderPSI"><Data ss:Type="String">RFT</Data></Cell>

    <Cell ss:StyleID="HeaderPSI"><Data ss:Type="String">PSI LV.2 NAME</Data></Cell>
    <Cell ss:StyleID="HeaderPSI"><Data ss:Type="String">QTY CHECKING</Data></Cell>
    <Cell ss:StyleID="HeaderPSI"><Data ss:Type="String">TOTAL DEFECT</Data></Cell>
    <Cell ss:StyleID="HeaderPSI"><Data ss:Type="String">RFT</Data></Cell>

    <Cell ss:StyleID="Header3rdParty"><Data ss:Type="String">AQL 3RD PARTY NAME</Data></Cell>
    <Cell ss:StyleID="Header3rdParty"><Data ss:Type="String">QTY CHECKING</Data></Cell>
    <Cell ss:StyleID="Header3rdParty"><Data ss:Type="String">TOTAL DEFECT</Data></Cell>
    <Cell ss:StyleID="Header3rdParty"><Data ss:Type="String">RFT</Data></Cell>

    <Cell ss:StyleID="HeaderT1QM"><Data ss:Type="String">T1QM 1 NAME</Data></Cell>
    <Cell ss:StyleID="HeaderT1QM"><Data ss:Type="String">QTY CHECKING</Data></Cell>
    <Cell ss:StyleID="HeaderT1QM"><Data ss:Type="String">TOTAL DEFECT</Data></Cell>
    <Cell ss:StyleID="HeaderT1QM"><Data ss:Type="String">RFT</Data></Cell>

    <Cell ss:StyleID="HeaderT1QM"><Data ss:Type="String">T1QM 2 NAME</Data></Cell>
    <Cell ss:StyleID="HeaderT1QM"><Data ss:Type="String">QTY CHECKING</Data></Cell>
    <Cell ss:StyleID="HeaderT1QM"><Data ss:Type="String">TOTAL DEFECT</Data></Cell>
    <Cell ss:StyleID="HeaderT1QM"><Data ss:Type="String">RFT</Data></Cell>

    <Cell ss:StyleID="HeaderT1QM"><Data ss:Type="String">T1QM 3 NAME</Data></Cell>
    <Cell ss:StyleID="HeaderT1QM"><Data ss:Type="String">QTY CHECKING</Data></Cell>
    <Cell ss:StyleID="HeaderT1QM"><Data ss:Type="String">TOTAL DEFECT</Data></Cell>
    <Cell ss:StyleID="HeaderT1QM"><Data ss:Type="String">RFT</Data></Cell>
   </Row>\n`;

  Object.entries(summaryPoGroups)
    .sort(([poA], [poB]) => poA.localeCompare(poB))
    .forEach(([poStr, items]) => {
      let inspDateVal = '-';
      let articleVal = '-';
      let modelVal = '-';
      let destinationVal = '-';
      let qtyOrderVal = 0;

      for (const item of items) {
        if (dateKey && item[dateKey] && String(item[dateKey]).trim() !== '-' && inspDateVal === '-') {
          inspDateVal = String(item[dateKey]).trim();
        }
        if (articleKey && item[articleKey] && String(item[articleKey]).trim() !== '-' && articleVal === '-') {
          articleVal = String(item[articleKey]).trim();
        }
        if (modelKey && item[modelKey] && String(item[modelKey]).trim() !== '-' && modelVal === '-') {
          modelVal = String(item[modelKey]).trim();
        }
        if (destinationKey && item[destinationKey] && String(item[destinationKey]).trim() !== '-' && destinationVal === '-') {
          destinationVal = String(item[destinationKey]).trim();
        }
        if (qtyOrderKey && item[qtyOrderKey] && qtyOrderVal === 0) {
          qtyOrderVal = parseNumber(item[qtyOrderKey]);
        }
      }

      const catData = {
        'CFA': { names: new Set(), qtyChecking: 0, totalDefect: 0, totalAGrade: 0, hasData: false, sumRft: 0, countRft: 0 },
        'PSI LV.1': { names: new Set(), qtyChecking: 0, totalDefect: 0, totalAGrade: 0, hasData: false, sumRft: 0, countRft: 0 },
        'PSI LV.2': { names: new Set(), qtyChecking: 0, totalDefect: 0, totalAGrade: 0, hasData: false, sumRft: 0, countRft: 0 },
        '3rd Party': { names: new Set(), qtyChecking: 0, totalDefect: 0, totalAGrade: 0, hasData: false, sumRft: 0, countRft: 0 },
        'T1QM 1': { names: new Set(), qtyChecking: 0, totalDefect: 0, totalAGrade: 0, hasData: false, sumRft: 0, countRft: 0 },
        'T1QM 2': { names: new Set(), qtyChecking: 0, totalDefect: 0, totalAGrade: 0, hasData: false, sumRft: 0, countRft: 0 },
        'T1QM 3': { names: new Set(), qtyChecking: 0, totalDefect: 0, totalAGrade: 0, hasData: false, sumRft: 0, countRft: 0 }
      };

      items.forEach(item => {
        const inspName = String(item[inspectorKey] || '').trim();
        const iType = resolveInspectorType ? resolveInspectorType(inspName, item) : null;

        if (iType && catData[iType]) {
          const target = catData[iType];
          target.hasData = true;
          if (inspName && inspName !== '-') target.names.add(inspName);

          const qIns = qtyInsKey ? parseNumber(item[qtyInsKey]) : 0;
          const tDef = totalDefectKey ? parseNumber(item[totalDefectKey]) : 0;
          const aGrd = aGradeKey ? parseNumber(item[aGradeKey]) : 0;
          target.qtyChecking += qIns;
          target.totalDefect += tDef;
          target.totalAGrade += aGrd;

          if (rftKey) {
            const rVal = parsePercent(item[rftKey]);
            if (rVal !== null) {
              target.sumRft += rVal;
              target.countRft++;
            }
          }
        }
      });

      const getCatFormatted = (type) => {
        const d = catData[type];
        if (!d.hasData) {
          return {
            name: '-',
            qtyCheckingCell: `<Cell ss:StyleID="CellCenter"><Data ss:Type="String">-</Data></Cell>`,
            totalDefectCell: `<Cell ss:StyleID="CellCenter"><Data ss:Type="String">-</Data></Cell>`,
            rftCell: `<Cell ss:StyleID="CellCenter"><Data ss:Type="String">-</Data></Cell>`
          };
        }

        const nameStr = d.names.size > 0 ? Array.from(d.names).join(', ') : '-';
        let rftVal = null;
        if (type === 'PSI LV.1' || type === 'PSI LV.2') {
          if (d.qtyChecking > 0) {
            rftVal = (d.totalAGrade / d.qtyChecking) * 100;
          } else {
            rftVal = 0;
          }
        } else {
          if (d.countRft > 0) {
            rftVal = d.sumRft / d.countRft;
          } else if (d.qtyChecking > 0) {
            rftVal = ((d.qtyChecking - d.totalDefect) / d.qtyChecking) * 100;
          } else {
            rftVal = 100;
          }
        }

        const rftStr = `${rftVal.toFixed(1).replace('.', ',')}%`;

        return {
          name: nameStr,
          qtyCheckingCell: `<Cell ss:StyleID="CellRight"><Data ss:Type="Number">${d.qtyChecking}</Data></Cell>`,
          totalDefectCell: `<Cell ss:StyleID="CellRight"><Data ss:Type="Number">${d.totalDefect}</Data></Cell>`,
          rftCell: `<Cell ss:StyleID="CellRight"><Data ss:Type="String">${escapeXml(rftStr)}</Data></Cell>`
        };
      };

      const cfaFmt = getCatFormatted('CFA');
      const psiLv1Fmt = getCatFormatted('PSI LV.1');
      const psiFmt = getCatFormatted('PSI LV.2');
      const party3Fmt = getCatFormatted('3rd Party');
      const t1qm1Fmt = getCatFormatted('T1QM 1');
      const t1qm2Fmt = getCatFormatted('T1QM 2');
      const t1qm3Fmt = getCatFormatted('T1QM 3');

      xml += `   <Row ss:Height="20">
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(inspDateVal)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(poStr)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(articleVal)}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${escapeXml(modelVal)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(destinationVal)}</Data></Cell>
    <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${qtyOrderVal}</Data></Cell>
    
    <Cell ss:StyleID="CellCFALeft"><Data ss:Type="String">${escapeXml(cfaFmt.name)}</Data></Cell>
    ${cfaFmt.qtyCheckingCell}
    ${cfaFmt.totalDefectCell}
    ${cfaFmt.rftCell}

    <Cell ss:StyleID="CellPSILeft"><Data ss:Type="String">${escapeXml(psiLv1Fmt.name)}</Data></Cell>
    ${psiLv1Fmt.qtyCheckingCell}
    ${psiLv1Fmt.totalDefectCell}
    ${psiLv1Fmt.rftCell}

    <Cell ss:StyleID="CellPSILeft"><Data ss:Type="String">${escapeXml(psiFmt.name)}</Data></Cell>
    ${psiFmt.qtyCheckingCell}
    ${psiFmt.totalDefectCell}
    ${psiFmt.rftCell}

    <Cell ss:StyleID="Cell3rdPartyLeft"><Data ss:Type="String">${escapeXml(party3Fmt.name)}</Data></Cell>
    ${party3Fmt.qtyCheckingCell}
    ${party3Fmt.totalDefectCell}
    ${party3Fmt.rftCell}

    <Cell ss:StyleID="CellT1QMLeft"><Data ss:Type="String">${escapeXml(t1qm1Fmt.name)}</Data></Cell>
    ${t1qm1Fmt.qtyCheckingCell}
    ${t1qm1Fmt.totalDefectCell}
    ${t1qm1Fmt.rftCell}

    <Cell ss:StyleID="CellT1QMLeft"><Data ss:Type="String">${escapeXml(t1qm2Fmt.name)}</Data></Cell>
    ${t1qm2Fmt.qtyCheckingCell}
    ${t1qm2Fmt.totalDefectCell}
    ${t1qm2Fmt.rftCell}

    <Cell ss:StyleID="CellT1QMLeft"><Data ss:Type="String">${escapeXml(t1qm3Fmt.name)}</Data></Cell>
    ${t1qm3Fmt.qtyCheckingCell}
    ${t1qm3Fmt.totalDefectCell}
    ${t1qm3Fmt.rftCell}
   </Row>
`;
    });

  xml += `  </Table>
 </Worksheet>\n`;

  xml += `</Workbook>`;

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

export const exportToExcelDetail = (data = [], rawData = [], resolveInspectorType, activeTab = 'CFA', filename, defectFilters = []) => {
  const dataset = data && data.length > 0 ? data : rawData || [];
  const firstItem = dataset[0] || (rawData && rawData[0]) || {};

  const dateKey = findKey(firstItem, 'date', 'tgl', 'tanggal', 'inspection_date', 'inspection date') || 'date';
  const modelKey = findKey(firstItem, 'model', 'style') || 'model';
  const factoryKey = findKey(firstItem, 'factory', 'building', 'plant') || 'factory';
  const cellKey = findKey(firstItem, 'cell', 'line') || 'cell';
  const articleKey = findKey(firstItem, 'article', 'article_no', 'art') || 'article';
  const destinationKey = findKey(firstItem, 'destination', 'dest', 'destinasi') || 'destination';
  const qtyInsKey = findKey(firstItem, 'qty_inspection', 'qty inspection', 'qty_checking', 'qty checking', 'checking') || 'qty_inspection';
  const aGradeKey = findKey(firstItem, 'total_a_grade', 'total a grade', 'a_grade', 'a grade', 'a-grade', 'grade_a', 'grade a', 'agrade') || 'total_a_grade';
  const bGradeKey = findKey(firstItem, 'total_b_grade', 'total b grade', 'b_grade', 'b grade', 'b-grade', 'grade_b', 'grade b', 'bgrade', 'avg_b_grade', 'avg b grade') || 'total_b_grade';
  const cGradeKey = findKey(firstItem, 'total_c_grade', 'total c grade', 'c_grade', 'c grade', 'c-grade', 'grade_c', 'grade c', 'cgrade', 'avg_c_grade', 'avg c grade') || 'total_c_grade';
  const totalDefectKey = findKey(firstItem, 'total_defect', 'total defect', 'qty_defect', 'defect') || 'total_defect';
  const rftKey = findKey(firstItem, 'rft');
  const qtyOrderKey = findKey(firstItem, 'qty_order', 'qty order', 'order_qty', 'order qty', 'qty') || 'qty_order';
  const poKey = findKey(firstItem, 'po') || 'po';
  const crdKey = findKey(firstItem, 'crd') || 'crd';
  const typeKey = findKey(firstItem, 'type_inspection', 'type inspection', 'inspection_type', 'inspector_type', 'type') || 'type_inspection';
  const inspectorKey = findKey(firstItem, 'inspector', 'inspector_name', 'name') || 'inspector';

  // Find all defect slot keys (Defect 1, Qty defect 1, Defect 2, Qty defect 2 ... up to max slots e.g. 25)
  const defectSlots = [];
  for (let i = 1; i <= 25; i++) {
    const nameK = findKey(firstItem, `defect_name_${i}`, `defect name ${i}`, `defectname${i}`);
    const qtyK = findKey(firstItem, `qty_defect_${i}`, `qty defect ${i}`, `qtydefect${i}`);
    if (nameK || qtyK) {
      defectSlots.push({
        index: i,
        nameKey: nameK || `defect_name_${i}`,
        qtyKey: qtyK || `qty_defect_${i}`
      });
    }
  }

  // If no defect slots found in keys, default to 5 slots
  if (defectSlots.length === 0) {
    for (let i = 1; i <= 5; i++) {
      defectSlots.push({
        index: i,
        nameKey: `defect_name_${i}`,
        qtyKey: `qty_defect_${i}`
      });
    }
  }

  // Precompute keys for all 25 defect slots
  const qtyDefectKeys = [];
  const defectNameKeys = [];
  for (let i = 1; i <= 25; i++) {
    qtyDefectKeys.push(
      findKey(firstItem, `qty_defect_${i}`, `qty defect ${i}`, `qtydefect${i}`) || `qty_defect_${i}`
    );
    defectNameKeys.push(
      findKey(firstItem, `defect_name_${i}`, `defect name ${i}`, `defectname${i}`) || `defect_name_${i}`
    );
  }

  // Filter dataset for current activeTab if specified (unless ALL or SUMMARY)
  let rows = dataset;
  if (activeTab && activeTab !== 'SUMMARY RFT' && resolveInspectorType) {
    const filtered = dataset.filter(item => {
      const inspName = String(item[inspectorKey] || '').trim();
      const iType = resolveInspectorType(inspName, item);
      return iType === activeTab;
    });
    if (filtered.length > 0) rows = filtered;
  }

  const isDefectFiltered = defectFilters && defectFilters.length > 0;

  if (isDefectFiltered) {
    rows = rows.filter(item => {
      let hasDefect = false;
      for (let i = 0; i < 25; i++) {
        const nameKey = defectNameKeys[i];
        const qtyKey = qtyDefectKeys[i];
        if (nameKey && qtyKey) {
          const dName = item[nameKey];
          const dQty = parseNumber(item[qtyKey]);
          if (dName && defectFilters.includes(String(dName).trim()) && dQty > 0) {
            hasDefect = true;
            break;
          }
        }
      }
      return hasDefect;
    });
  }

  const outFilename = filename || `Inspection_Detail_${activeTab ? activeTab.replace(/\s+/g, '_') : 'Report'}.xls`;

  // Construct XML SpreadsheetML
  let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#160B3B" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
  </Style>
  <Style ss:ID="Cell">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellRight">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
 </Styles>

 <!-- Sheet 1: Inspection Detail -->
 <Worksheet ss:Name="Inspection Detail">
  <Table>
   <Row ss:Height="25" ss:StyleID="Header">
    <Cell><Data ss:Type="String">Inspection Date</Data></Cell>
    <Cell><Data ss:Type="String">Model</Data></Cell>
    <Cell><Data ss:Type="String">Factory</Data></Cell>
    <Cell><Data ss:Type="String">Cell</Data></Cell>`;

  defectSlots.forEach(slot => {
    xml += `
    <Cell><Data ss:Type="String">Defect ${slot.index}</Data></Cell>
    <Cell><Data ss:Type="String">Qty defect ${slot.index}</Data></Cell>`;
  });

  xml += `
    <Cell><Data ss:Type="String">Qty inspection</Data></Cell>
    <Cell><Data ss:Type="String">Total A-Grade</Data></Cell>
    <Cell><Data ss:Type="String">Total B-Grade</Data></Cell>
    <Cell><Data ss:Type="String">Total C-Grade</Data></Cell>
    <Cell><Data ss:Type="String">Total Qty Defect</Data></Cell>
    <Cell><Data ss:Type="String">RFT</Data></Cell>
    <Cell><Data ss:Type="String">Qty Order</Data></Cell>
    <Cell><Data ss:Type="String">PO</Data></Cell>
    <Cell><Data ss:Type="String">${activeTab === 'CFA' ? 'Destination' : 'CRD'}</Data></Cell>
    <Cell><Data ss:Type="String">level inspector</Data></Cell>
    <Cell><Data ss:Type="String">inspector name</Data></Cell>
   </Row>\n`;

  rows.forEach(item => {
    const dateVal = item[dateKey] ? String(item[dateKey]).trim() : '-';
    const modelVal = item[modelKey] ? String(item[modelKey]).trim() : '-';
    const factoryVal = item[factoryKey] ? String(item[factoryKey]).trim() : '-';
    const cellVal = item[cellKey] ? String(item[cellKey]).trim() : '-';
    const qtyInsVal = parseNumber(item[qtyInsKey]);
    const totalAGradeVal = aGradeKey ? parseNumber(item[aGradeKey]) : 0;
    const totalBGradeVal = bGradeKey ? parseNumber(item[bGradeKey]) : 0;
    const totalCGradeVal = cGradeKey ? parseNumber(item[cGradeKey]) : 0;
    const qtyOrderVal = qtyOrderKey ? parseNumber(item[qtyOrderKey]) : 0;
    const poVal = item[poKey] ? String(item[poKey]).trim() : '-';
    const crdVal = item[crdKey] ? String(item[crdKey]).trim() : '-';

    let totalDefectVal = 0;
    qtyDefectKeys.forEach(k => {
      if (item[k] !== undefined && item[k] !== null) {
        totalDefectVal += parseNumber(item[k]);
      }
    });
    if (totalDefectVal === 0 && totalDefectKey && item[totalDefectKey] !== undefined && item[totalDefectKey] !== null && item[totalDefectKey] !== '') {
      totalDefectVal = parseNumber(item[totalDefectKey]);
    }

    const inspNameVal = item[inspectorKey] ? String(item[inspectorKey]).trim() : '-';
    const levelInspectorVal = resolveInspectorType ? (resolveInspectorType(inspNameVal, item) || activeTab) : (item[typeKey] || activeTab);

    let rftVal = null;
    if (activeTab === 'PSI LV.1' || activeTab === 'PSI LV.2' || levelInspectorVal === 'PSI LV.1' || levelInspectorVal === 'PSI LV.2') {
      if (qtyInsVal > 0) {
        rftVal = (totalAGradeVal / qtyInsVal) * 100;
      } else {
        rftVal = 0;
      }
    } else {
      if (rftKey) rftVal = parsePercent(item[rftKey]);
      if (rftVal === null) {
        if (qtyInsVal > 0) {
          rftVal = ((qtyInsVal - totalDefectVal) / qtyInsVal) * 100;
        } else {
          rftVal = 100;
        }
      }
    }
    const rftStr = `${rftVal.toFixed(1).replace('.', ',')}%`;

    xml += `   <Row ss:Height="20">
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(dateVal)}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${escapeXml(modelVal)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(factoryVal)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(cellVal)}</Data></Cell>`;

    defectSlots.forEach(slot => {
      const defName = item[slot.nameKey] ? String(item[slot.nameKey]).trim() : '-';
      const defQty = parseNumber(item[slot.qtyKey]);

      let finalDefNameStr = (defName && defName !== 'NO DATA') ? defName : '-';
      let finalDefQty = defQty;

      if (isDefectFiltered && finalDefNameStr !== '-' && !defectFilters.includes(finalDefNameStr.trim())) {
        finalDefNameStr = '-';
        finalDefQty = 0;
      }

      xml += `
    <Cell ss:StyleID="Cell"><Data ss:Type="String">\${escapeXml(finalDefNameStr)}</Data></Cell>
    <Cell ss:StyleID="CellRight"><Data ss:Type="Number">\${finalDefQty}</Data></Cell>`;
    });

    xml += `
    <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${qtyInsVal}</Data></Cell>
    <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${totalAGradeVal}</Data></Cell>
    <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${totalBGradeVal}</Data></Cell>
    <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${totalCGradeVal}</Data></Cell>
    <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${totalDefectVal}</Data></Cell>
    <Cell ss:StyleID="CellRight"><Data ss:Type="String">${escapeXml(rftStr)}</Data></Cell>
    <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${qtyOrderVal}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(poVal)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(crdVal)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(levelInspectorVal)}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${escapeXml(inspNameVal)}</Data></Cell>
   </Row>\n`;
  });

  xml += `  </Table>
 </Worksheet>\n`;

  // --- Sheet 2: Summary Total Inspection Base on PO ---
  const summaryPoGroups = {};
  rows.forEach(item => {
    const rawPo = item[poKey];
    if (!rawPo || String(rawPo).trim() === '' || String(rawPo).trim() === '-') return;
    const poStr = String(rawPo).trim();

    if (!summaryPoGroups[poStr]) {
      summaryPoGroups[poStr] = [];
    }
    summaryPoGroups[poStr].push(item);
  });

  xml += ` <Worksheet ss:Name="Summary Total Inspection">
  <Table>
   <Row ss:Height="25" ss:StyleID="Header">
    <Cell><Data ss:Type="String">Factory</Data></Cell>
    <Cell><Data ss:Type="String">Cell</Data></Cell>
    <Cell><Data ss:Type="String">Model</Data></Cell>
    <Cell><Data ss:Type="String">Article</Data></Cell>
    <Cell><Data ss:Type="String">PO</Data></Cell>
    <Cell><Data ss:Type="String">${activeTab === 'CFA' ? 'Finish Prod' : 'Destination'}</Data></Cell>
    <Cell><Data ss:Type="String">Qty Order</Data></Cell>
    <Cell><Data ss:Type="String">Total Inspection</Data></Cell>
    <Cell><Data ss:Type="String">A-Grade</Data></Cell>
    <Cell><Data ss:Type="String">B-Grade</Data></Cell>
    <Cell><Data ss:Type="String">C-Grade</Data></Cell>
    <Cell><Data ss:Type="String">Defect</Data></Cell>
    <Cell><Data ss:Type="String">Total Defect</Data></Cell>
    <Cell><Data ss:Type="String">RFT</Data></Cell>
   </Row>\n`;

  Object.entries(summaryPoGroups)
    .sort(([poA], [poB]) => poA.localeCompare(poB))
    .forEach(([poStr, items]) => {
      const factorySet = new Set();
      const cellSet = new Set();
      const modelSet = new Set();
      const articleSet = new Set();
      const destSet = new Set();

      let qtyOrderVal = 0;
      let totalInspectionVal = 0;
      let totalAGradeVal = 0;
      let totalBGradeVal = 0;
      let totalCGradeVal = 0;
      let totalDefectVal = 0;

      items.forEach(item => {
        if (factoryKey && item[factoryKey]) {
          const f = String(item[factoryKey]).trim();
          if (f && f !== '-') factorySet.add(f);
        }
        if (cellKey && item[cellKey]) {
          const c = String(item[cellKey]).trim();
          if (c && c !== '-') cellSet.add(c);
        }
        if (modelKey && item[modelKey]) {
          const m = String(item[modelKey]).trim();
          if (m && m !== '-') modelSet.add(m);
        }
        if (articleKey && item[articleKey]) {
          const a = String(item[articleKey]).trim();
          if (a && a !== '-') articleSet.add(a);
        }
        if (destinationKey && item[destinationKey]) {
          const d = String(item[destinationKey]).trim();
          if (d && d !== '-') destSet.add(d);
        }

        const qOrder = qtyOrderKey ? parseNumber(item[qtyOrderKey]) : 0;
        if (qOrder > qtyOrderVal) qtyOrderVal = qOrder;

        totalInspectionVal += qtyInsKey ? parseNumber(item[qtyInsKey]) : 0;
        totalAGradeVal += aGradeKey ? parseNumber(item[aGradeKey]) : 0;
        totalBGradeVal += bGradeKey ? parseNumber(item[bGradeKey]) : 0;
        totalCGradeVal += cGradeKey ? parseNumber(item[cGradeKey]) : 0;

        // Sum defect across qty_defect_1 to 25
        let rowDefectSum = 0;
        qtyDefectKeys.forEach(k => {
          if (item[k] !== undefined && item[k] !== null) {
            rowDefectSum += parseNumber(item[k]);
          }
        });
        if (rowDefectSum === 0 && totalDefectKey && item[totalDefectKey] !== undefined && item[totalDefectKey] !== null && item[totalDefectKey] !== '') {
          rowDefectSum = parseNumber(item[totalDefectKey]);
        }
        totalDefectVal += rowDefectSum;
      });

      const factoryVal = factorySet.size > 0 ? Array.from(factorySet).join(', ') : '-';
      const cellVal = cellSet.size > 0 ? Array.from(cellSet).join(', ') : '-';
      const modelVal = modelSet.size > 0 ? Array.from(modelSet).join(', ') : '-';
      const articleVal = articleSet.size > 0 ? Array.from(articleSet).join(', ') : '-';
      const destinationVal = destSet.size > 0 ? Array.from(destSet).join(', ') : '-';

      // 12. Defect (kolom total defect - kolom b-grade - kolom c-grade)
      const defectVal = Math.max(0, totalDefectVal - totalBGradeVal - totalCGradeVal);

      // 14. RFT
      let rftVal = 0;
      if (activeTab === 'PSI LV.1' || activeTab === 'PSI LV.2') {
        if (totalInspectionVal > 0) {
          rftVal = (totalAGradeVal / totalInspectionVal) * 100;
          if (rftVal < 0) rftVal = 0;
        } else {
          rftVal = 0;
        }
      } else {
        if (totalInspectionVal > 0) {
          rftVal = ((totalInspectionVal - totalDefectVal) / totalInspectionVal) * 100;
          if (rftVal < 0) rftVal = 0;
        } else {
          rftVal = 100;
        }
      }
      const rftStr = `${rftVal.toFixed(1).replace('.', ',')}%`;

      xml += `   <Row ss:Height="20">
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(factoryVal)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(cellVal)}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${escapeXml(modelVal)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(articleVal)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(poStr)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(destinationVal)}</Data></Cell>
    <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${qtyOrderVal}</Data></Cell>
    <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${totalInspectionVal}</Data></Cell>
    <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${totalAGradeVal}</Data></Cell>
    <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${totalBGradeVal}</Data></Cell>
    <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${totalCGradeVal}</Data></Cell>
    <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${defectVal}</Data></Cell>
    <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${totalDefectVal}</Data></Cell>
    <Cell ss:StyleID="CellRight"><Data ss:Type="String">${escapeXml(rftStr)}</Data></Cell>
   </Row>\n`;
    });

  xml += `  </Table>
 </Worksheet>\n`;

  // --- Sheet 3: Defect Filter Summary ---
  if (isDefectFiltered) {
    const defectCounts = {};
    rows.forEach(item => {
      for (let i = 0; i < 25; i++) {
        const nameKey = defectNameKeys[i];
        const qtyKey = qtyDefectKeys[i];
        if (nameKey && qtyKey) {
          const dName = item[nameKey];
          const dQty = parseNumber(item[qtyKey]);
          if (dName && defectFilters.includes(String(dName).trim()) && dQty > 0) {
            const keyStr = String(dName).trim();
            if (!defectCounts[keyStr]) defectCounts[keyStr] = 0;
            defectCounts[keyStr] += dQty;
          }
        }
      }
    });

    xml += ` <Worksheet ss:Name="Defect Filter Summary">
  <Table>
   <Row ss:Height="25" ss:StyleID="Header">
    <Cell><Data ss:Type="String">Defect Name</Data></Cell>
    <Cell><Data ss:Type="String">Qty Defect</Data></Cell>
   </Row>\n`;

    Object.entries(defectCounts).sort((a, b) => b[1] - a[1]).forEach(([name, count]) => {
      xml += `   <Row ss:Height="20">
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${escapeXml(name)}</Data></Cell>
    <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${count}</Data></Cell>
   </Row>\n`;
    });

    xml += `  </Table>
 </Worksheet>\n`;
  }

  xml += `</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = outFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
