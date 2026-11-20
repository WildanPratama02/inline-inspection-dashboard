import React, { useMemo } from 'react';
import { groupTrendDefects } from '../utils/dataUtils';

// Yellow-orange theme so the Trend Defect table stands out from the other panels
const GROUP_STYLE = {
  SOILING: 'text-yellow-300',
  BONDING: 'text-orange-400',
};

// Trend Defect table (PSI LV.2): Soiling = Contamination defects, Bonding = Bonding gap defects.
// `defects` = every defect name with its total qty for the current filters.
const TrendDefectTable = ({ defects = [] }) => {
  const groups = useMemo(() => groupTrendDefects(defects), [defects]);

  return (
    <div className="border-2 border-amber-400/80 bg-amber-500/10 px-2 pt-2 pb-2 rounded-sm">
      <h2 className="text-sm font-bold mb-2 text-center uppercase tracking-widest text-black bg-gradient-to-r from-yellow-400 to-orange-500 rounded-sm py-1">
        Trend Defect
      </h2>
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-amber-400/60 bg-amber-400/25 text-amber-100 uppercase text-[11px] font-bold">
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
                  <tr key={`${group.key}-${item.name}`} className="border-b border-amber-400/15">
                    {idx === 0 && (
                      <td
                        rowSpan={rows.length + 1}
                        className={`py-1.5 px-2 align-middle font-bold uppercase border-r border-amber-400/30 ${GROUP_STYLE[group.key] || ''}`}
                      >
                        {group.label}
                      </td>
                    )}
                    <td className="py-1.5 px-2 text-white/85">{item.name}</td>
                    <td className="py-1.5 px-2 text-right font-bold tabular-nums">{item.value.toLocaleString('id-ID')}</td>
                  </tr>
                ))}
                <tr className="border-b border-amber-400/50 bg-orange-500/20">
                  <td className="py-1 px-2 text-[10px] uppercase font-bold text-amber-200 text-right">Total {group.label}</td>
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
