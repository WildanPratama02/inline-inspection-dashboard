import axios from 'axios';
import Papa from 'papaparse';

const RAW_DATA_URL = 'https://docs.google.com/spreadsheets/d/1a-uVy2HfZlitzW1kJ-DGoVisnKbIVKeFZRahH4QwL6I/export?format=csv&gid=1063163792';
const SUMMARY_DATA_URL = 'https://docs.google.com/spreadsheets/d/1a-uVy2HfZlitzW1kJ-DGoVisnKbIVKeFZRahH4QwL6I/export?format=csv&gid=445107403';
// CFA uses the MASTER DATA AQL INSPECTION sheet — fetch by sheet name via GViz CSV endpoint
const CFA_DATA_URL = 'https://docs.google.com/spreadsheets/d/1kr0Ae1b5m2cTTY_gKQ6_fIfDkFLoqiWr7RZssGxWF9s/gviz/tq?tqx=out:csv&sheet=MASTER%20DATA%20AQL%20INSPECTION';

export const fetchData = async () => {
  try {
    const [rawRes, summaryRes, cfaRes] = await Promise.all([
      axios.get(RAW_DATA_URL),
      axios.get(SUMMARY_DATA_URL),
      axios.get(CFA_DATA_URL).catch(() => ({ data: '' })) // fallback jika link error/kosong
    ]);

    let rawData = Papa.parse(rawRes.data, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.toLowerCase().trim().replace(/\s+/g, '_'),
      transform: (v) => v.trim()
    }).data;

    const summaryData = Papa.parse(summaryRes.data, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.toLowerCase().trim().replace(/\s+/g, '_'),
      transform: (v) => v.trim()
    }).data;

    let cfaData = [];
    if (cfaRes && cfaRes.data) {
      const rawCfaData = Papa.parse(cfaRes.data, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.toLowerCase().trim().replace(/\s+/g, '_'),
        transform: (v) => v.trim()
      }).data;

      // MASTER DATA AQL INSPECTION — each row is ONE inspection record with up to 5 defect slots.
      // Columns: inspection_date, historycal_po, factory, cell, po, destination, article, model,
      //          finish_production, qty_inspection, sample_lot,
      //          defect_name_1..5, defect_clasification_1..5, qty_defect_1..5,
      //          total_minor, total_major, total_critical, total_defect, rft, status, inspector_name

      cfaData = rawCfaData
        .filter(row => {
          const po = row['po'] || '';
          return po && String(po).trim() !== '';
        })
        .map(row => {
          const parseNum = (v) => {
            if (!v) return 0;
            return parseInt(String(v).replace(/,/g, '').replace(/%/g, '')) || 0;
          };

          // Parse inspection date (DD/MM/YYYY format from sheet)
          const rawDate = row['inspection_date'] || '';
          let date = rawDate;
          if (rawDate.includes('/')) {
            // Already DD/MM/YYYY — keep as-is for consistency with other data
            date = rawDate;
          }

          const item = {
            date: date,
            factory: row['factory'] || '',
            cell: row['cell'] || '',
            model: row['model'] || '',
            article: row['article'] || '',
            po: row['po'] || '',
            destination: row['destination'] || '',
            crd: row['destination'] || '', // map destination to crd for UI consistency
            finish_production: row['finish_production'] || '',
            historycal_po: row['historycal_po'] || '',
            qty_order: 0, // Not available in CFA sheet
            qty_inspection: parseNum(row['qty_inspection']),
            sample_lot: parseNum(row['sample_lot']),
            type_inspection: 'CFA',
            inspector: row['inspector_name'] || '-',
          };

          // Map defect slots 1-5
          for (let i = 1; i <= 5; i++) {
            item[`defect_name_${i}`] = row[`defect_name_${i}`] || '';
            item[`classification_${i}`] = row[`defect_clasification_${i}`] || '';
            item[`qty_defect_${i}`] = parseNum(row[`qty_defect_${i}`]);
          }

          // Pre-computed totals from sheet
          item.total_minor = parseNum(row['total_minor']);
          item.total_major = parseNum(row['total_major']);
          item.total_critical = parseNum(row['total_critical']);
          item.total_defect = parseNum(row['total_defect']);

          // RFT from sheet (e.g. "99%" or "98%")
          const rftStr = row['rft'] || '0%';
          const rftNum = parseFloat(rftStr.replace('%', '').replace(',', '.')) || 0;
          item.rft = `${rftNum.toFixed(1).replace('.', ',')}%`;

          // Status (PASS/FAIL)
          const statusRaw = (row['status'] || '').trim().toUpperCase();
          item.status_po = statusRaw.includes('PASS') ? 'PASS' : statusRaw.includes('FAIL') ? 'FAIL' : statusRaw || 'UNKNOWN';

          return item;
        });

      // Gabungkan data
      rawData = [...rawData, ...cfaData];
    }

    return { rawData, summaryData };
  } catch (error) {
    console.error('Error fetching Google Sheets data:', error);
    return { rawData: [], summaryData: [] };
  }
};
