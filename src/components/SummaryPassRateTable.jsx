import React, { useMemo, useState } from 'react';
import { findKey, parseNumber, parsePercent } from '../utils/dataUtils';

const CategoryTable = ({ title, icon, nameColumnLabel, rows, searchTerm, hidePassFail = false }) => {
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter(r =>
      r.po.toLowerCase().includes(term) ||
      r.inspectorName.toLowerCase().includes(term) ||
      r.result.toLowerCase().includes(term)
    );
  }, [rows, searchTerm]);

  const totals = useMemo(() => {
    const totalInspection = filteredRows.length;
    let totalPass = 0;
    let totalFail = 0;
    let sumRft = 0;

    filteredRows.forEach(r => {
      if (r.result === 'PASS') totalPass++;
      else if (r.result === 'FAIL') totalFail++;
      sumRft += (r.rftVal || 0);
    });

    const avgRftVal = totalInspection > 0 ? (sumRft / totalInspection) : 0;
    const avgRftStr = `${avgRftVal.toFixed(1).replace('.', ',')}%`;

    return { totalInspection, totalPass, totalFail, avgRftStr };
  }, [filteredRows]);

  return (
    <div className="industrial-border bg-white/5 rounded-sm p-4 flex flex-col gap-3">
      {/* Category Header with summary stats */}
      <div className="flex justify-between items-center border-b border-white/10 pb-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white/90 flex items-center gap-2">
          <span>{icon}</span> {title}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {!hidePassFail && (
            <>
              <span className="text-[11px] text-white/80 font-bold bg-white/10 px-2.5 py-0.5 rounded">
                TOTAL INSPECTION: {totals.totalInspection}
              </span>
              <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded">
                PASS: {totals.totalPass}
              </span>
              <span className="text-[11px] text-rose-400 font-bold bg-rose-500/10 border border-rose-500/30 px-2.5 py-0.5 rounded">
                FAIL: {totals.totalFail}
              </span>
            </>
          )}
          <span className="text-[11px] text-cyan-300 font-bold bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 rounded">
            AVG RFT: {totals.avgRftStr}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-white/20 bg-[#160B3B] text-white/90 uppercase text-[11px] font-bold tracking-wider">
              <th className="py-2.5 px-4 w-[25%]">PO</th>
              <th className="py-2.5 px-4 text-center w-[35%]">{nameColumnLabel}</th>
              <th className="py-2.5 px-4 text-center w-[20%]">RFT</th>
              <th className="py-2.5 px-4 text-right w-[20%]">RESULT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-white/40 text-xs font-medium">
                  Tidak ada data inspeksi untuk {title}.
                </td>
              </tr>
            ) : (
              filteredRows.map((r, idx) => (
                <tr key={`${r.po}-${idx}`} className="hover:bg-white/10 transition-colors font-medium">
                  <td className="py-2.5 px-4 font-bold text-white font-mono tracking-wide">{r.po}</td>
                  <td className="py-2.5 px-4 text-center font-bold text-white/90">{r.inspectorName || '-'}</td>
                  <td className="py-2.5 px-4 text-center font-bold text-white">{r.rftStr}</td>
                  <td className="py-2.5 px-4 text-right font-bold">
                    <span
                      className={`inline-block px-3 py-0.5 rounded text-[11px] font-extrabold border ${r.result === 'PASS'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}
                    >
                      {r.result}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SummaryPassRateTable = ({ data = [], rawData = [], resolveInspectorType }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const { cfaRows, psiLv1Rows, psiRows, party3Rows, t1qmRows } = useMemo(() => {
    if (!data || data.length === 0) {
      return { cfaRows: [], psiLv1Rows: [], psiRows: [], party3Rows: [], t1qmRows: [] };
    }

    const firstItem = rawData[0] || data[0] || {};
    const poKey = findKey(firstItem, 'po') || 'po';
    const inspectorKey = findKey(firstItem, 'inspector', 'inspector_name', 'name') || 'inspector';
    const statusKey = findKey(firstItem, 'status_po', 'status po', 'status_inspection', 'status inspection', 'status', 'result', 'pass_fail');
    const rftKey = findKey(firstItem, 'rft');
    const qtyInsKey = findKey(firstItem, 'qty_inspection', 'qty inspection');
    const aGradeKey = findKey(firstItem, 'total_a_grade', 'total a grade', 'a_grade', 'a grade', 'agrade', 'a-grade', 'grade_a', 'grade a') || 'a_grade';
    const totalDefectKey = findKey(firstItem, 'total_defect', 'total defect', 'qty_defect', 'qty defect');

    // Group items by category (each inspection row preserved)
    const catItems = {
      'CFA': [],
      'PSI LV.1': [],
      'PSI LV.2': [],
      '3rd Party': [],
      'T1QM': []
    };

    data.forEach(item => {
      const rawPo = item[poKey];
      if (!rawPo || String(rawPo).trim() === '' || String(rawPo).trim() === '-') return;

      const inspName = String(item[inspectorKey] || '').trim();
      const iType = resolveInspectorType ? resolveInspectorType(inspName, item) : null;

      if (iType) {
        if (iType.startsWith('T1QM') || iType === 'T1QM') {
          catItems['T1QM'].push(item);
        } else if (catItems[iType]) {
          catItems[iType].push(item);
        }
      }
    });

    const processCategoryItems = (items, categoryType) => {
      return items.map((item, index) => {
        const rawPo = item[poKey];
        const po = String(rawPo).trim();

        const inspName = String(item[inspectorKey] || '').trim();
        const inspectorName = (inspName && inspName !== '-') ? inspName : '-';

        // RFT for this specific inspection row
        let rftVal = null;
        if (categoryType === 'PSI LV.1' || categoryType === 'PSI LV.2') {
          const totalIns = qtyInsKey ? parseNumber(item[qtyInsKey]) : 0;
          const totalAGradeVal = aGradeKey ? parseNumber(item[aGradeKey]) : 0;
          rftVal = totalIns > 0 ? (totalAGradeVal / totalIns) * 100 : 0;
        } else {
          if (rftKey) {
            rftVal = parsePercent(item[rftKey]);
          }
          if (rftVal === null) {
            const totalIns = qtyInsKey ? parseNumber(item[qtyInsKey]) : 0;
            const totalDefects = totalDefectKey ? parseNumber(item[totalDefectKey]) : 0;
            if (totalIns > 0) {
              rftVal = ((totalIns - totalDefects) / totalIns) * 100;
            } else {
              rftVal = 0;
            }
          }
        }

        const rftStr = `${rftVal.toFixed(1).replace('.', ',')}%`;

        // Result calculation: PSI is always PASS
        let result = 'PASS';
        if (categoryType === 'PSI LV.1' || categoryType === 'PSI LV.2') {
          result = 'PASS';
        } else {
          if (statusKey && item[statusKey] !== undefined && item[statusKey] !== null && item[statusKey] !== '') {
            const s = String(item[statusKey]).trim().toUpperCase();
            if (s.includes('FAIL') || s.includes('REJECT') || s === 'F') {
              result = 'FAIL';
            } else if (s.includes('PASS') || s.includes('APPROV') || s === 'P') {
              result = 'PASS';
            } else {
              result = rftVal >= 100 ? 'PASS' : 'FAIL';
            }
          } else {
            result = rftVal >= 100 ? 'PASS' : 'FAIL';
          }
        }

        return {
          id: `${po}-${index}`,
          po,
          inspectorName,
          rftVal,
          rftStr,
          result
        };
      });
    };

    return {
      cfaRows: processCategoryItems(catItems['CFA'], 'CFA'),
      psiLv1Rows: processCategoryItems(catItems['PSI LV.1'], 'PSI LV.1'),
      psiRows: processCategoryItems(catItems['PSI LV.2'], 'PSI LV.2'),
      party3Rows: processCategoryItems(catItems['3rd Party'], '3rd Party'),
      t1qmRows: processCategoryItems(catItems['T1QM'], 'T1QM')
    };
  }, [data, rawData, resolveInspectorType]);

  const totalAllInspections = cfaRows.length + psiLv1Rows.length + psiRows.length + party3Rows.length + t1qmRows.length;

  return (
    <div className="industrial-border bg-primary p-4 relative w-full rounded-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-white/5 rounded-sm p-3 mb-4 border border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-base font-bold text-white uppercase tracking-wider">
            📊 SUMMARY PO &amp; RFT STATUS
          </span>
          <span className="bg-white/10 text-white/70 text-xs font-bold px-2.5 py-1 rounded">
            TOTAL INSPECTIONS: {totalAllInspections}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search PO or Inspector..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-black/40 border border-white/20 text-white text-xs px-3 py-1.5 rounded focus:outline-none focus:border-white/50 w-64 placeholder-white/40 font-medium"
          />
        </div>
      </div>

      {/* Stacked Tables */}
      <div className="flex flex-col gap-5">
        {/* Table 1: CFA */}
        <CategoryTable
          title="AQL CFA SUMMARY"
          icon="🏢"
          nameColumnLabel="CFA NAME"
          rows={cfaRows}
          searchTerm={searchTerm}
        />

        {/* Table 1.5: PSI LV.1 */}
        <CategoryTable
          title="PSI LV.1 SUMMARY"
          icon="📋"
          nameColumnLabel="PSI LV.1 NAME"
          rows={psiLv1Rows}
          searchTerm={searchTerm}
          hidePassFail={true}
        />

        {/* Table 2: PSI LV.2 */}
        <CategoryTable
          title="PSI LV.2 SUMMARY"
          icon="📋"
          nameColumnLabel="PSI LV.2 NAME"
          rows={psiRows}
          searchTerm={searchTerm}
          hidePassFail={true}
        />

        {/* Table 3: AQL 3rd Party */}
        <CategoryTable
          title="AQL 3RD PARTY SUMMARY"
          icon="🤝"
          nameColumnLabel="AQL 3RD PARTY NAME"
          rows={party3Rows}
          searchTerm={searchTerm}
        />

        {/* Table 4: T1QM */}
        <CategoryTable
          title="T1QM SUMMARY"
          icon="🔍"
          nameColumnLabel="T1QM NAME"
          rows={t1qmRows}
          searchTerm={searchTerm}
        />
      </div>
    </div>
  );
};

export default SummaryPassRateTable;
