// Convert the SpreadsheetML 2003 XML our exports build into a real .xlsx file.
//
// The Excel exports were saved as `.xls` but contain SpreadsheetML XML, so Excel
// warns "The file format and extension don't match" on open. Rather than rewrite
// every export, the existing XML builders stay as they are and this module turns
// their output into an Office Open XML workbook (zip), keeping the features the
// exports use: styles (font, fill, borders, alignment, number format), column
// widths, row heights, merged cells, R1C1 formulas, DateTime cells, freeze panes
// and autofilter. No dependencies — includes a tiny XML parser and zip writer.

// ── Minimal XML parser (well-formed, self-generated input only) ──
const decodeEntities = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, e) => {
  const k = e.toLowerCase();
  if (k === 'amp') return '&';
  if (k === 'lt') return '<';
  if (k === 'gt') return '>';
  if (k === 'quot') return '"';
  if (k === 'apos') return "'";
  if (k.startsWith('#x')) return String.fromCodePoint(parseInt(k.slice(2), 16));
  return String.fromCodePoint(parseInt(k.slice(1), 10));
});

const localName = (name) => name.slice(name.indexOf(':') + 1);

export const parseXml = (xml) => {
  const root = { name: '#root', attrs: {}, children: [], text: '' };
  const stack = [root];
  const tagRe = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<\/([^\s>]+)\s*>|<([^\s/>]+)((?:\s+[^\s=]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
  const attrRe = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let last = 0;
  let m;
  while ((m = tagRe.exec(xml))) {
    const top = stack[stack.length - 1];
    if (m.index > last) top.text += decodeEntities(xml.slice(last, m.index));
    last = tagRe.lastIndex;
    if (m[1] !== undefined) { top.text += m[1]; continue; }
    if (m[2]) { stack.pop(); continue; }
    if (!m[3]) continue; // comment / processing instruction
    const attrs = {};
    let a;
    attrRe.lastIndex = 0;
    while ((a = attrRe.exec(m[4] || ''))) attrs[localName(a[1])] = decodeEntities(a[2] ?? a[3] ?? '');
    const node = { name: localName(m[3]), attrs, children: [], text: '' };
    top.children.push(node);
    if (!m[5]) stack.push(node);
  }
  return root;
};

const child = (node, name) => node && node.children.find((c) => c.name === name);
const kids = (node, name) => (node ? node.children.filter((c) => c.name === name) : []);

// ── Helpers ──
const esc = (v) => String(v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  // strip characters XML 1.0 forbids
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

export const colLetter = (n) => {
  let s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
};

const argb = (hex) => {
  const h = String(hex || '').replace('#', '').trim();
  return /^[0-9a-f]{6}$/i.test(h) ? `FF${h.toUpperCase()}` : null;
};

// R1C1 → A1 (handles RC, RnCn, R[n]C[n]; leaves quoted strings untouched)
export const r1c1ToA1 = (formula, row, col) => {
  const body = String(formula || '').replace(/^=/, '');
  return body.split('"').map((part, i) => (i % 2 ? part : part.replace(
    /(?<![A-Za-z0-9_$])R(\[-?\d+\]|\d+)?C(\[-?\d+\]|\d+)?(?![A-Za-z0-9_(])/g,
    (_, r, c) => {
      const resolve = (v, base) => {
        if (!v) return { n: base, abs: false };
        if (v.startsWith('[')) return { n: base + parseInt(v.slice(1, -1), 10), abs: false };
        return { n: parseInt(v, 10), abs: true };
      };
      const rr = resolve(r, row);
      const cc = resolve(c, col);
      return `${cc.abs ? '$' : ''}${colLetter(cc.n)}${rr.abs ? '$' : ''}${rr.n}`;
    }
  ))).join('"');
};

const rangeR1C1ToA1 = (range) => {
  const m = /^R(\d+)C(\d+)(?::R(\d+)C(\d+))?$/i.exec(String(range || '').trim());
  if (!m) return null;
  const a = `${colLetter(+m[2])}${m[1]}`;
  return m[3] ? `${a}:${colLetter(+m[4])}${m[3]}` : a;
};

// "2026-11-13T00:00:00.000" → Excel serial date
const toSerialDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2}))?/.exec(String(iso || ''));
  if (!m) return null;
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  return utc / 86400000 + 25569;
};

const sheetNameSafe = (name, used) => {
  let base = String(name || 'Sheet').replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Sheet';
  let candidate = base;
  let i = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${i++})`;
    candidate = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(candidate.toLowerCase());
  return candidate;
};

// ── Styles ──
const BORDER_WEIGHT = { 0: 'hair', 1: 'thin', 2: 'medium', 3: 'thick' };
const BORDER_LINE = { Dash: 'dashed', Dot: 'dotted', Double: 'double', DashDot: 'dashDot', DashDotDot: 'dashDotDot', SlantDashDot: 'slantDashDot' };
const BUILTIN_NUMFMT = { General: 0, '0': 1, '0.00': 2, '#,##0': 3, '#,##0.00': 4, '0%': 9, '0.00%': 10, '@': 49 };

const readStyle = (styleNode) => {
  const s = {};
  const font = child(styleNode, 'Font');
  if (font) s.font = { ...font.attrs };
  const interior = child(styleNode, 'Interior');
  if (interior && Object.keys(interior.attrs).length) s.interior = { ...interior.attrs };
  const align = child(styleNode, 'Alignment');
  if (align) s.align = { ...align.attrs };
  const borders = child(styleNode, 'Borders');
  if (borders && borders.children.length) {
    s.borders = {};
    kids(borders, 'Border').forEach((b) => { s.borders[b.attrs.Position] = { ...b.attrs }; });
  }
  const numFmt = child(styleNode, 'NumberFormat');
  if (numFmt && numFmt.attrs.Format) s.numFmt = numFmt.attrs.Format;
  return s;
};

// SpreadsheetML styles inherit unspecified properties from Default (and ss:Parent)
const mergeStyle = (base, over) => ({
  font: { ...(base.font || {}), ...(over.font || {}) },
  interior: over.interior || base.interior,
  align: { ...(base.align || {}), ...(over.align || {}) },
  borders: over.borders || base.borders,
  numFmt: over.numFmt || base.numFmt,
});

class StyleTable {
  constructor(stylesNode) {
    const raw = {};
    kids(stylesNode, 'Style').forEach((st) => { raw[st.attrs.ID] = { node: st, parent: st.attrs.Parent }; });
    const resolved = {};
    const resolve = (id, seen = new Set()) => {
      if (resolved[id]) return resolved[id];
      const entry = raw[id];
      if (!entry || seen.has(id)) return resolved.Default || {};
      seen.add(id);
      const parentId = entry.parent || (id === 'Default' ? null : 'Default');
      const base = parentId ? resolve(parentId, seen) : {};
      resolved[id] = mergeStyle(base, readStyle(entry.node));
      return resolved[id];
    };
    this.resolve = (id) => resolve(id || 'Default');

    this.fonts = [];
    this.fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
    this.borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>'];
    this.numFmts = [];
    this.xfs = [];
    this.xfIndex = {};
    this.styleXf(this.resolve('Default')); // xf 0 = Default
  }

  pool(list, xml) {
    let i = list.indexOf(xml);
    if (i === -1) { list.push(xml); i = list.length - 1; }
    return i;
  }

  styleXf(style) {
    const f = style.font || {};
    const fontXml = `<font>${f.Bold === '1' ? '<b/>' : ''}${f.Italic === '1' ? '<i/>' : ''}${f.Underline && f.Underline !== 'None' ? '<u/>' : ''}`
      + `<sz val="${esc(f.Size || 11)}"/>${argb(f.Color) ? `<color rgb="${argb(f.Color)}"/>` : ''}<name val="${esc(f.FontName || 'Calibri')}"/></font>`;
    const fontId = this.pool(this.fonts, fontXml);

    let fillId = 0;
    const fillColor = style.interior && argb(style.interior.Color);
    if (fillColor && (style.interior.Pattern || 'Solid') !== 'None') {
      fillId = this.pool(this.fills, `<fill><patternFill patternType="solid"><fgColor rgb="${fillColor}"/><bgColor indexed="64"/></patternFill></fill>`);
    }

    let borderId = 0;
    if (style.borders) {
      const side = (tag, pos) => {
        const b = style.borders[pos];
        if (!b || b.LineStyle === 'None') return `<${tag}/>`;
        const weight = BORDER_WEIGHT[b.Weight ?? 1] || 'thin';
        const line = BORDER_LINE[b.LineStyle] || weight;
        const color = argb(b.Color);
        return `<${tag} style="${line}">${color ? `<color rgb="${color}"/>` : '<color auto="1"/>'}</${tag}>`;
      };
      borderId = this.pool(this.borders, `<border>${side('left', 'Left')}${side('right', 'Right')}${side('top', 'Top')}${side('bottom', 'Bottom')}<diagonal/></border>`);
    }

    let numFmtId = 0;
    if (style.numFmt) {
      if (BUILTIN_NUMFMT[style.numFmt] !== undefined) numFmtId = BUILTIN_NUMFMT[style.numFmt];
      else {
        let entry = this.numFmts.find((n) => n.code === style.numFmt);
        if (!entry) { entry = { id: 164 + this.numFmts.length, code: style.numFmt }; this.numFmts.push(entry); }
        numFmtId = entry.id;
      }
    }

    const a = style.align || {};
    const alignAttrs = [];
    if (a.Horizontal && a.Horizontal !== 'Automatic') alignAttrs.push(`horizontal="${a.Horizontal.charAt(0).toLowerCase()}${a.Horizontal.slice(1)}"`);
    if (a.Vertical && a.Vertical !== 'Automatic') alignAttrs.push(`vertical="${a.Vertical === 'Center' ? 'center' : a.Vertical.toLowerCase()}"`);
    if (a.WrapText === '1') alignAttrs.push('wrapText="1"');
    const alignXml = alignAttrs.length ? `<alignment ${alignAttrs.join(' ')}/>` : '';

    const xf = `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"`
      + `${numFmtId ? ' applyNumberFormat="1"' : ''}${fontId ? ' applyFont="1"' : ''}${fillId ? ' applyFill="1"' : ''}${borderId ? ' applyBorder="1"' : ''}`
      + `${alignXml ? ` applyAlignment="1">${alignXml}</xf>` : '/>'}`;
    return this.pool(this.xfs, xf);
  }

  xfFor(styleId) {
    const key = styleId || 'Default';
    if (this.xfIndex[key] === undefined) this.xfIndex[key] = this.styleXf(this.resolve(key));
    return this.xfIndex[key];
  }

  toXml() {
    const numFmts = this.numFmts.length
      ? `<numFmts count="${this.numFmts.length}">${this.numFmts.map((n) => `<numFmt numFmtId="${n.id}" formatCode="${esc(n.code)}"/>`).join('')}</numFmts>`
      : '';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + numFmts
      + `<fonts count="${this.fonts.length}">${this.fonts.join('')}</fonts>`
      + `<fills count="${this.fills.length}">${this.fills.join('')}</fills>`
      + `<borders count="${this.borders.length}">${this.borders.join('')}</borders>`
      + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
      + `<cellXfs count="${this.xfs.length}">${this.xfs.join('')}</cellXfs>`
      + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
      + '</styleSheet>';
  }
}

// ── Worksheet ──
const buildSheet = (ws, styles) => {
  const table = child(ws, 'Table');
  const cols = [];
  const rowsXml = [];
  const merges = [];
  let maxCol = 0;
  let maxRow = 0;

  if (table) {
    let colIdx = 0;
    kids(table, 'Column').forEach((c) => {
      colIdx = c.attrs.Index ? parseInt(c.attrs.Index, 10) : colIdx + 1;
      const span = parseInt(c.attrs.Span || '0', 10);
      if (c.attrs.Width) {
        const chars = Math.max(0, (parseFloat(c.attrs.Width) / 0.75 - 5) / 7);
        cols.push(`<col min="${colIdx}" max="${colIdx + span}" width="${chars.toFixed(2)}" customWidth="1"/>`);
      }
      colIdx += span;
    });

    let rowIdx = 0;
    kids(table, 'Row').forEach((r) => {
      rowIdx = r.attrs.Index ? parseInt(r.attrs.Index, 10) : rowIdx + 1;
      maxRow = Math.max(maxRow, rowIdx);
      const cells = [];
      let cIdx = 0;
      kids(r, 'Cell').forEach((c) => {
        cIdx = c.attrs.Index ? parseInt(c.attrs.Index, 10) : cIdx + 1;
        const ref = `${colLetter(cIdx)}${rowIdx}`;
        const s = styles.xfFor(c.attrs.StyleID || r.attrs.StyleID);
        const sAttr = s ? ` s="${s}"` : '';
        const across = parseInt(c.attrs.MergeAcross || '0', 10);
        const down = parseInt(c.attrs.MergeDown || '0', 10);
        if (across || down) merges.push(`${ref}:${colLetter(cIdx + across)}${rowIdx + down}`);
        maxCol = Math.max(maxCol, cIdx + across);

        const data = child(c, 'Data');
        if (c.attrs.Formula) {
          cells.push(`<c r="${ref}"${sAttr}><f>${esc(r1c1ToA1(c.attrs.Formula, rowIdx, cIdx))}</f></c>`);
        } else if (data) {
          const type = data.attrs.Type || 'String';
          const text = data.text;
          const num = Number(String(text).trim());
          if (type === 'Number' && String(text).trim() !== '' && Number.isFinite(num)) {
            cells.push(`<c r="${ref}"${sAttr}><v>${num}</v></c>`);
          } else if (type === 'DateTime' && toSerialDate(text) !== null) {
            cells.push(`<c r="${ref}"${sAttr}><v>${toSerialDate(text)}</v></c>`);
          } else if (type === 'Boolean') {
            cells.push(`<c r="${ref}"${sAttr} t="b"><v>${String(text).trim() === '1' ? 1 : 0}</v></c>`);
          } else {
            cells.push(`<c r="${ref}"${sAttr} t="inlineStr"><is><t xml:space="preserve">${esc(text)}</t></is></c>`);
          }
        } else if (s) {
          cells.push(`<c r="${ref}"${sAttr}/>`);
        }
        cIdx += across;
      });
      const ht = r.attrs.Height ? ` ht="${parseFloat(r.attrs.Height)}" customHeight="1"` : '';
      rowsXml.push(`<row r="${rowIdx}"${ht}>${cells.join('')}</row>`);
    });
  }

  // Freeze panes (WorksheetOptions/FreezePanes + SplitHorizontal / SplitVertical)
  let sheetView = '<sheetView workbookViewId="0"/>';
  const opts = child(ws, 'WorksheetOptions');
  if (opts && child(opts, 'FreezePanes')) {
    const ySplit = parseInt((child(opts, 'SplitHorizontal') || {}).text || '0', 10) || 0;
    const xSplit = parseInt((child(opts, 'SplitVertical') || {}).text || '0', 10) || 0;
    if (ySplit || xSplit) {
      const pane = ySplit && xSplit ? 'bottomRight' : ySplit ? 'bottomLeft' : 'topRight';
      const topLeft = `${colLetter(xSplit + 1)}${ySplit + 1}`;
      sheetView = `<sheetView workbookViewId="0"><pane${xSplit ? ` xSplit="${xSplit}"` : ''}${ySplit ? ` ySplit="${ySplit}"` : ''}`
        + ` topLeftCell="${topLeft}" activePane="${pane}" state="frozen"/><selection pane="${pane}" activeCell="${topLeft}" sqref="${topLeft}"/></sheetView>`;
    }
  }

  const autoFilterNode = child(ws, 'AutoFilter');
  const autoFilter = autoFilterNode ? rangeR1C1ToA1(autoFilterNode.attrs.Range) : null;

  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + `<dimension ref="A1${maxRow && maxCol ? `:${colLetter(maxCol)}${maxRow}` : ''}"/>`
    + `<sheetViews>${sheetView}</sheetViews>`
    + '<sheetFormatPr defaultRowHeight="15"/>'
    + (cols.length ? `<cols>${cols.join('')}</cols>` : '')
    + `<sheetData>${rowsXml.join('')}</sheetData>`
    + (autoFilter ? `<autoFilter ref="${autoFilter}"/>` : '')
    + (merges.length ? `<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '')
    + '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>'
    + '</worksheet>';
  return { xml, autoFilter };
};

// ── Zip (STORE, no compression) ──
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (bytes) => {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
};

export const zipStore = (files) => {
  const enc = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  files.forEach(({ name, data }) => {
    const nameBytes = enc.encode(name);
    const bytes = typeof data === 'string' ? enc.encode(data) : data;
    const crc = crc32(bytes);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint16(8, 0, true);
    local.setUint16(10, dosTime, true);
    local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, bytes.length, true);
    local.setUint32(22, bytes.length, true);
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true);
    chunks.push(new Uint8Array(local.buffer), nameBytes, bytes);

    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, 0x0800, true);
    cd.setUint16(10, 0, true);
    cd.setUint16(12, dosTime, true);
    cd.setUint16(14, dosDate, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, bytes.length, true);
    cd.setUint32(24, bytes.length, true);
    cd.setUint16(28, nameBytes.length, true);
    cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), nameBytes);
    offset += 30 + nameBytes.length + bytes.length;
  });

  const cdSize = central.reduce((n, c) => n + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);

  const all = [...chunks, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((n, c) => n + c.length, 0));
  let p = 0;
  all.forEach((c) => { out.set(c, p); p += c.length; });
  return out;
};

// ── Public API ──
export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const spreadsheetMlToXlsx = (spreadsheetMl) => {
  const doc = parseXml(spreadsheetMl);
  const workbook = child(doc, 'Workbook');
  if (!workbook) throw new Error('Invalid SpreadsheetML: no <Workbook>');
  const styles = new StyleTable(child(workbook, 'Styles'));
  const usedNames = new Set();
  const worksheets = kids(workbook, 'Worksheet');
  if (!worksheets.length) throw new Error('Invalid SpreadsheetML: no <Worksheet>');

  const sheets = worksheets.map((ws, i) => {
    const name = sheetNameSafe(ws.attrs.Name || `Sheet${i + 1}`, usedNames);
    return { name, ...buildSheet(ws, styles) };
  });

  const definedNames = sheets
    .map((s, i) => (s.autoFilter
      ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${esc(s.name.replace(/'/g, "''"))}'!${s.autoFilter.replace(/([A-Z]+)(\d+)/g, '$$$1$$$2')}</definedName>`
      : ''))
    .join('');

  const files = [
    {
      name: '[Content_Types].xml',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        + '<Default Extension="xml" ContentType="application/xml"/>'
        + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        + sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
        + '</Types>',
    },
    {
      name: '_rels/.rels',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        + '</Relationships>',
    },
    {
      name: 'xl/workbook.xml',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        + '<bookViews><workbookView/></bookViews>'
        + `<sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>`
        + (definedNames ? `<definedNames>${definedNames}</definedNames>` : '')
        + '<calcPr calcId="191029" fullCalcOnLoad="1"/>'
        + '</workbook>',
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
        + `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
        + '</Relationships>',
    },
    { name: 'xl/styles.xml', data: styles.toXml() },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: s.xml })),
  ];

  return zipStore(files);
};

// Force a .xlsx extension (callers historically passed .xls)
export const toXlsxFilename = (filename) => {
  const base = String(filename || 'Export').replace(/\.(xls|xlsx|xml)$/i, '');
  return `${base}.xlsx`;
};

// Convert SpreadsheetML → .xlsx and trigger a browser download
export const downloadSpreadsheetMlAsXlsx = (spreadsheetMl, filename) => {
  const bytes = spreadsheetMlToXlsx(spreadsheetMl);
  const blob = new Blob([bytes], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = toXlsxFilename(filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
