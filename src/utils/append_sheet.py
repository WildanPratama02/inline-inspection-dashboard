import os

path = r"d:\inline-inspection-dashboard\src\utils\excelExportUtils.js"
with open(path, "r", encoding='utf8') as f:
    content = f.read()

target = "  xml += `</Workbook>`;"

sheet_xml = """
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
   </Row>\\n`;

    Object.entries(defectCounts).sort((a, b) => b[1] - a[1]).forEach(([name, count]) => {
      xml += `   <Row ss:Height="20">
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${escapeXml(name)}</Data></Cell>
    <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${count}</Data></Cell>
   </Row>\\n`;
    });

    xml += `  </Table>
 </Worksheet>\\n`;
  }

"""

if target in content and "// --- Sheet 3: Defect Filter Summary ---" not in content:
    content = content.replace(target, sheet_xml + "\n" + target)
    with open(path, "w", encoding="utf8") as f:
        f.write(content)
    print("Appended new sheet successfully.")
else:
    print("Could not find target or sheet already exists.")
