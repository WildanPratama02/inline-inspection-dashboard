import React from 'react';
import { groupTrendDefects } from '../utils/dataUtils';

// Indonesian thousands separator (1.234), same as the email views
const formatQty = (num) => (Number(num) || 0).toLocaleString('id-ID');

// TREND DEFECT table for the email PDF exports (PSI LV.2, AQL 3rd Party).
// Soiling = Contamination, Bonding = Bonding gap. Light email theme with yellow-orange highlight.
const TREND_COLORS = { SOILING: '#a16207', BONDING: '#c2410c' };
const EmailTrendDefectTable = ({ defects = [] }) => {
  const groups = groupTrendDefects(defects);
  const cell = { padding: '4px 6px', borderBottom: '1px solid #fde68a' };
  return (
    <div style={{ backgroundColor: '#fffbeb', border: '2px solid #f59e0b', padding: '8px', borderRadius: '3px' }}>
      <div
        style={{
          fontSize: '11px', fontWeight: 900, color: '#000000', textAlign: 'center', textTransform: 'uppercase',
          letterSpacing: '1px', background: 'linear-gradient(90deg, #facc15, #f97316)', padding: '4px 0',
          borderRadius: '2px', marginBottom: '6px'
        }}
      >
        TREND DEFECT
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', color: '#0f172a' }}>
        <thead>
          <tr style={{ backgroundColor: '#fde68a', borderBottom: '1px solid #f59e0b' }}>
            <th style={{ ...cell, textAlign: 'left', fontWeight: 800, fontSize: '9px', width: '90px' }}>TREND DEFECT</th>
            <th style={{ ...cell, textAlign: 'left', fontWeight: 800, fontSize: '9px' }}>DEFECT NAME</th>
            <th style={{ ...cell, textAlign: 'right', fontWeight: 800, fontSize: '9px', width: '50px' }}>QTY</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const rows = group.items.length ? group.items : [{ name: '-', value: 0 }];
            const color = TREND_COLORS[group.key] || '#0f172a';
            return (
              <React.Fragment key={group.key}>
                {rows.map((item, idx) => (
                  <tr key={`${group.key}-${item.name}`}>
                    {idx === 0 && (
                      <td
                        rowSpan={rows.length + 1}
                        style={{ ...cell, fontWeight: 900, color, textTransform: 'uppercase', verticalAlign: 'middle', borderRight: '1px solid #fcd34d', borderBottom: '1px solid #f59e0b' }}
                      >
                        {group.label}
                      </td>
                    )}
                    <td style={{ ...cell, fontWeight: 600 }}>{item.name}</td>
                    <td style={{ ...cell, textAlign: 'right', fontWeight: 800 }}>{formatQty(item.value)}</td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: '#fed7aa' }}>
                  <td style={{ ...cell, borderBottom: '1px solid #f59e0b', textAlign: 'right', fontWeight: 800, fontSize: '8.5px', color: '#7c2d12', textTransform: 'uppercase' }}>
                    TOTAL {group.label}
                  </td>
                  <td style={{ ...cell, borderBottom: '1px solid #f59e0b', textAlign: 'right', fontWeight: 900, color }}>{formatQty(group.total)}</td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default EmailTrendDefectTable;
