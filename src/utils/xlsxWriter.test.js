import assert from 'node:assert/strict';
import test from 'node:test';
import { colLetter, parseXml, r1c1ToA1, spreadsheetMlToXlsx, toXlsxFilename } from './xlsxWriter.js';

test('converts column numbers to letters', () => {
  assert.equal(colLetter(1), 'A');
  assert.equal(colLetter(26), 'Z');
  assert.equal(colLetter(27), 'AA');
  assert.equal(colLetter(61), 'BI');
});

test('converts R1C1 formulas to A1 without touching strings or function names', () => {
  assert.equal(r1c1ToA1('=IF(RC20>0,RC21/RC20,"")', 5, 22), 'IF($T5>0,$U5/$T5,"")');
  assert.equal(r1c1ToA1('=IFERROR((RC56="MATCH")/(RC56<>""),"")', 7, 61), 'IFERROR(($BD7="MATCH")/($BD7<>""),"")');
  assert.equal(r1c1ToA1('=R[-1]C+R2C[1]', 4, 3), 'C3+D$2');
});

test('parses SpreadsheetML attributes and decodes entities', () => {
  const doc = parseXml('<?xml version="1.0"?><Workbook xmlns:ss="x"><Worksheet ss:Name="A &amp; B"><Table><Row><Cell><Data ss:Type="String">x &lt; y</Data></Cell></Row></Table></Worksheet></Workbook>');
  const ws = doc.children[0].children[0];
  assert.equal(ws.attrs.Name, 'A & B');
  assert.equal(ws.children[0].children[0].children[0].children[0].text, 'x < y');
});

test('builds a zip workbook with one part per sheet', () => {
  const bytes = spreadsheetMlToXlsx(`<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles><Style ss:ID="Default"><Font ss:FontName="Calibri" ss:Size="11"/></Style>
  <Style ss:ID="H"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#160B3B" ss:Pattern="Solid"/></Style></Styles>
 <Worksheet ss:Name="One"><Table><Row ss:StyleID="H"><Cell><Data ss:Type="String">Head</Data></Cell></Row>
  <Row><Cell><Data ss:Type="Number">12</Data></Cell><Cell ss:Index="3" ss:MergeAcross="1"><Data ss:Type="String">m</Data></Cell></Row></Table></Worksheet>
 <Worksheet ss:Name="Two"><Table/></Worksheet>
</Workbook>`);
  assert.deepEqual([...bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]); // PK zip header
  const text = new TextDecoder().decode(bytes);
  assert.match(text, /xl\/worksheets\/sheet2\.xml/);
  assert.match(text, /<mergeCell ref="C2:D2"\/>/);
  assert.match(text, /<c r="A2"[^>]*><v>12<\/v><\/c>/);
  assert.match(text, /<fgColor rgb="FF160B3B"\/>/);
});

test('forces an .xlsx file extension', () => {
  assert.equal(toXlsxFilename('Inspection_Detail_PSI_LV.2_Supporting.xls'), 'Inspection_Detail_PSI_LV.2_Supporting.xlsx');
  assert.equal(toXlsxFilename('Report.xlsx'), 'Report.xlsx');
  assert.equal(toXlsxFilename('Report'), 'Report.xlsx');
});
