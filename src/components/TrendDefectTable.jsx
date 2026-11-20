import React, { useMemo } from 'react';
import { groupTrendDefects } from '../utils/dataUtils';

const GROUP_STYLE = {
  SOILING: 'text-amber-300',
  BONDING: 'text-sky-300',
};

// Trend Defect table (PSI LV.2): Soiling = Contamination defects, Bonding = Bonding gap defects.
// `defects` = every defect name with its total qty for the current filters.
const TrendDefectTable = ({ defects = [] }) => {
  const groups = useMemo(() => groupTrendDefects(defects), [defects]);

  return (
    <div className="industrial-border bg-white/5 px-2 pt-1 pb-2">
      <h2 className="text-sm font-bold mb-2 text-center uppercase tracking-widest border-b border-white/20 pb-1">
        Trend Defect
      </h2>
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-white/20 bg-white/10 text-white/80 uppercase text-[11px] font-bold">
            <th className="py-1.5 px-2 w-[110px]">Trend Defect</th>
            <th className="py-1.5 px-2">Defect Name</th>
            <th className="py-1.5 px-2 text-right w-[70px]">QTY</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const rows = group.items.length ? group.items : [{ name: '-', value: 0 }];
            return (
              <React.Fragment key={group.key}>
                {rows.map((item, idx) => (
                  <tr key={`${group.key}-${item.name}`} className="border-b border-white/10">
                    {idx === 0 && (
                      <td
                        rowSpan={rows.length + 1}
                        className={`py-1.5 px-2 align-middle font-bold uppercase border-r border-white/10 ${GROUP_STYLE[group.key] || ''}`}
                      >
                        {group.label}
                      </td>
                    )}
                    <td className="py-1.5 px-2 text-white/85">{item.name}</td>
                    <td className="py-1.5 px-2 text-right font-bold tabular-nums">{item.value.toLocaleString('id-ID')}</td>
                  </tr>
                ))}
                <tr className="border-b border-white/20 bg-white/5">
                  <td className="py-1 px-2 text-[10px] uppercase font-bold text-white/60 text-right">Total {group.label}</td>
                  <td className={`py-1 px-2 text-right font-bold tabular-nums ${GROUP_STYLE[group.key] || ''}`}>
                    {group.total.toLocaleString('id-ID')}
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TrendDefectTable;
