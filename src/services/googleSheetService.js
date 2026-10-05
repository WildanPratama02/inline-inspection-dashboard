import axios from 'axios';
import Papa from 'papaparse';

const RAW_DATA_URL = 'https://docs.google.com/spreadsheets/d/1a-uVy2HfZlitzW1kJ-DGoVisnKbIVKeFZRahH4QwL6I/export?format=csv&gid=1063163792';
const SUMMARY_DATA_URL = 'https://docs.google.com/spreadsheets/d/1a-uVy2HfZlitzW1kJ-DGoVisnKbIVKeFZRahH4QwL6I/export?format=csv&gid=445107403';
const CFA_DATA_URL = 'https://docs.google.com/spreadsheets/d/1kr0Ae1b5m2cTTY_gKQ6_fIfDkFLoqiWr7RZssGxWF9s/export?format=csv&gid=0';

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

      // CFA uses a one-row-per-defect structure. We group it by PO + Date + Cell.
      const groupedCfa = {};

      // Helper to try resolving Indonesian alphabet dates to DD/MM/YYYY
      const indoMonths = {
        'januari': '01', 'jan': '01', 'februari': '02', 'feb': '02',
        'maret': '03', 'mar': '03', 'april': '04', 'apr': '04',
        'mei': '05', 'juni': '06', 'jun': '06', 'juli': '07', 'jul': '07',
        'agustus': '08', 'agu': '08', 'september': '09', 'sep': '09',
        'oktober': '10', 'okt': '10', 'november': '11', 'nov': '11', 'desember': '12', 'des': '12'
      };
      const parseIndoDate = (dateStr) => {
        if (!dateStr) return '';
        const parts = dateStr.trim().replace(/\s+/g, ' ').split(' ');
        if (parts.length >= 3) {
          const d = parts[0].padStart(2, '0');
          const m = indoMonths[parts[1].toLowerCase()] || parts[1];
          const y = parts[2];
          return `${d}/${m}/${y}`;
        }
        return dateStr;
      };

      rawCfaData.forEach(row => {
        const po = row['po'] || '';
        const rawTanggal = row['tanggal'] || '';
        const tanggal = parseIndoDate(rawTanggal);
        const cell = row['cell'] || '';
        const factory = row['factory'] || '';
        const model = row['model'] || '';
        const article = row['article'] || '';
        const destination = row['destination'] || '';
        const qtyOrder = row['qty'] ? (parseInt(row['qty'].toString().replace(/,/g, '')) || 0) : 0;
        const qtyCheck = row['qty_check'] ? (parseInt(row['qty_check'].toString().replace(/,/g, '')) || 0) : 0;
        const defectName = row['defect_name'] || '';
        const classification = row['type'] || '';
        const qtyDefect = row['defect'] ? (parseInt(row['defect'].toString().replace(/,/g, '')) || 0) : 0;

        const key = `${po}-${tanggal}-${cell}`;
        if (!po || String(po).trim() === '') return; // skip rows without PO

        if (!groupedCfa[key]) {
          groupedCfa[key] = {
            date: tanggal,
            factory: factory,
            cell: cell,
            model: model,
            article: article,
            po: po,
            destination: destination,
            crd: destination, // map destination to crd for UI consistency
            qty_order: qtyOrder,
            qty_inspection: qtyCheck,
            type_inspection: 'CFA',
            inspector: '-', // Default inspector since it's not present in columns
            total_defect: 0
          };
        }

        const curr = groupedCfa[key];

        if (defectName && String(defectName).trim() !== '') {
          let dIndex = 1;
          while (curr[`defect_name_${dIndex}`] && dIndex <= 25) {
            dIndex++;
          }
          if (dIndex <= 25) {
            curr[`defect_name_${dIndex}`] = defectName;
            curr[`qty_defect_${dIndex}`] = qtyDefect;
            curr[`classification_${dIndex}`] = classification;
            curr.total_defect += qtyDefect;
          }
        }
      });

      // Calculate RFT and Status for each grouped inspection
      Object.values(groupedCfa).forEach(item => {
        const insp = parseInt(item.qty_inspection) || 0;
        const def = parseInt(item.total_defect) || 0;
        if (insp > 0) {
          const rftVal = ((insp - def) / insp) * 100;
          item.rft = `${rftVal.toFixed(1).replace('.', ',')}%`;
          item.status_po = rftVal >= 100 ? 'PASS' : 'FAIL';
        } else {
          item.rft = '0,0%';
          item.status_po = 'FAIL';
        }
      });

      cfaData = Object.values(groupedCfa);

      // Gabungkan data
      rawData = [...rawData, ...cfaData];
    }

    return { rawData, summaryData };
  } catch (error) {
    console.error('Error fetching Google Sheets data:', error);
    return { rawData: [], summaryData: [] };
  }
};
