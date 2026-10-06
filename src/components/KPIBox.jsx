import React from 'react';

const formatNumberIndo = (num) => {
  if (num === null || num === undefined || num === '-') return '-';
  const val = Number(num);
  if (isNaN(val)) return '-';
  return val.toLocaleString('id-ID');
};

// ── ANSI AQL Limit Table (based on QTY CHECKING) ──
// QTY CHECKING : 3,  5,  8,  13, 20, 32, 50, 80, 125, 200
// MINOR  limit : 1,  1,  1,   2,  2,  3,  4,  6,   8,  11
// MAJOR  limit : 1,  1,  1,   1,  2,  2,  3,  4,   6,   8
// CRITICAL     : 0  (zero tolerance)
const AQL_CHECKING_STEPS = [3, 5, 8, 13, 20, 32, 50, 80, 125, 200];
const AQL_MINOR_LIMITS   = [1, 1, 1,  2,  2,  3,  4,  6,   8,  11];
const AQL_MAJOR_LIMITS   = [1, 1, 1,  1,  2,  2,  3,  4,   6,   8];

const getAqlLimits = (qtyChecking) => {
  const qty = Number(qtyChecking);
  if (!qty || isNaN(qty) || qty <= 0) return { minor: '-', major: '-', critical: 0 };

  // Find the closest step that is >= qtyChecking (round up),
  // or use the last step if qty exceeds the table maximum.
  let idx = AQL_CHECKING_STEPS.findIndex(step => step >= qty);
  if (idx === -1) idx = AQL_CHECKING_STEPS.length - 1;

  return {
    minor:    AQL_MINOR_LIMITS[idx],
    major:    AQL_MAJOR_LIMITS[idx],
    critical: 0,
  };
};

const formatPercentIndo = (num) => {
  if (num === null || num === undefined) return '0,0%';
  const val = parseFloat(num);
  if (isNaN(val)) return '0,0%';
  return val.toLocaleString('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }) + '%';
};

const KPIBox = ({ kpis, metadata = {}, is3rdParty = false, activeTab }) => {
  // ── Khusus AQL 3rd Party: 8 KPI box (4×2) ──
  if (activeTab === '3rd Party') {
    return (
      <div className="grid grid-cols-4 gap-2">

        {/* ── BARIS 1 ── */}

        {/* 1. QTY ORDER — BIRU */}
        <div className="kpi-qty-inspection p-2 px-3 flex flex-col justify-between industrial-border rounded-sm h-[76px]">
          <span className="text-[11px] uppercase font-bold text-white/95 self-start leading-tight">QTY ORDER</span>
          <span className="text-[26px] font-bold text-center self-center my-auto text-white tracking-wide">
            {formatNumberIndo(kpis.qtyOrder)}
          </span>
        </div>

        {/* 2. QTY CHECKING — KUNING */}
        <div className="kpi-yellow p-2 px-3 flex flex-col justify-between industrial-border rounded-sm h-[76px]">
          <span className="text-[11px] uppercase font-bold text-white/95 self-start leading-tight">QTY CHECKING</span>
          <span className="text-[26px] font-bold text-center self-center my-auto text-white tracking-wide">
            {formatNumberIndo(kpis.qtyChecking ?? kpis.qtyInspection)}
          </span>
        </div>

        {/* 3. TOTAL A-GRADE — HIJAU */}
        <div className="kpi-rft p-2 px-3 flex flex-col justify-between industrial-border rounded-sm h-[76px]">
          <span className="text-[11px] uppercase font-bold text-white/95 self-start leading-tight">TOTAL A-GRADE</span>
          <span className="text-[26px] font-bold text-center self-center my-auto text-white tracking-wide">
            {formatNumberIndo(kpis.totalAGrade ?? kpis.aGrade)}
          </span>
        </div>

        {/* 4. TOTAL B-GRADE — ORANGE */}
        <div className="kpi-b-grade p-2 px-3 flex flex-col justify-between industrial-border rounded-sm h-[76px]">
          <span className="text-[11px] uppercase font-bold text-white/95 self-start leading-tight">TOTAL B-GRADE</span>
          <span className="text-[26px] font-bold text-center self-center my-auto text-white tracking-wide">
            {formatNumberIndo(kpis.totalBGrade ?? kpis.bGrade)}
          </span>
        </div>

        {/* ── BARIS 2 ── */}

        {/* 5. TOTAL DEFECT — MERAH */}
        <div className="kpi-qty-defect p-2 px-3 flex flex-col justify-between industrial-border rounded-sm h-[76px]">
          <span className="text-[11px] uppercase font-bold text-white/95 self-start leading-tight">TOTAL DEFECT</span>
          <span className="text-[26px] font-bold text-center self-center my-auto text-white tracking-wide">
            {formatNumberIndo(kpis.qtyDefect)}
          </span>
        </div>

        {/* 6. QTY MINOR DEFECT — KUNING */}
        <div className="kpi-yellow p-2 px-3 flex flex-col justify-between industrial-border rounded-sm h-[76px]">
          <span className="text-[11px] uppercase font-bold text-white/95 self-start leading-tight">QTY MINOR DEFECT</span>
          <span className="text-[26px] font-bold text-center self-center my-auto text-white tracking-wide">
            {formatNumberIndo(kpis.minorDefect)}
            <span className="text-[15px] font-semibold text-white/60 ml-0.5">
              /{getAqlLimits(kpis.qtyChecking ?? kpis.qtyInspection).minor}
            </span>
          </span>
        </div>

        {/* 7. QTY MAJOR DEFECT — ORANGE */}
        <div className="kpi-b-grade p-2 px-3 flex flex-col justify-between industrial-border rounded-sm h-[76px]">
          <span className="text-[11px] uppercase font-bold text-white/95 self-start leading-tight">QTY MAJOR DEFECT</span>
          <span className="text-[26px] font-bold text-center self-center my-auto text-white tracking-wide">
            {formatNumberIndo(kpis.majorDefect)}
            <span className="text-[15px] font-semibold text-white/60 ml-0.5">
              /{getAqlLimits(kpis.qtyChecking ?? kpis.qtyInspection).major}
            </span>
          </span>
        </div>

        {/* 8. QTY CRITICAL DEFECT — MERAH TUA */}
        <div className="kpi-critical-red p-2 px-3 flex flex-col justify-between industrial-border rounded-sm h-[76px]">
          <span className="text-[11px] uppercase font-bold text-white/95 self-start leading-tight">QTY CRITICAL DEFECT</span>
          <span className="text-[26px] font-bold text-center self-center my-auto text-white tracking-wide">
            {formatNumberIndo(kpis.criticalDefect)}
            <span className="text-[15px] font-semibold text-white/60 ml-0.5">
              /{getAqlLimits(kpis.qtyChecking ?? kpis.qtyInspection).critical}
            </span>
          </span>
        </div>

      </div>
    );
  }

  // ── CFA Layout — 6 KPI boxes with CFA-specific data ──
  if (activeTab === 'CFA') {
    const cfaQtyInspection = kpis.sampleLot || 0;
    const cfaQtyDefect = kpis.sheetDefect || 0;
    const cfaQtyPass = cfaQtyInspection - cfaQtyDefect;
    return (
      <div className="grid grid-cols-3 gap-2">
        {/* Row 1 */}
        {/* 1. QTY INSPECTION — warna biru */}
        <div className="kpi-qty-inspection p-2 px-3 flex flex-col justify-between industrial-border rounded-sm h-[80px]">
          <span className="text-[12px] uppercase font-bold text-white/95 self-start">QTY INSPECTION</span>
          <span className="text-[30px] font-bold text-center self-center my-auto text-white tracking-wide">
            {formatNumberIndo(cfaQtyInspection)}
          </span>
        </div>
        {/* 2. QTY DEFECT — warna merah */}
        <div className="kpi-qty-defect p-2 px-3 flex flex-col justify-between industrial-border rounded-sm h-[80px]">
          <span className="text-[12px] uppercase font-bold text-white/95 self-start">QTY DEFECT</span>
          <span className="text-[30px] font-bold text-center self-center my-auto text-white tracking-wide">
            {formatNumberIndo(cfaQtyDefect)}
          </span>
        </div>
        {/* 3. QTY PASS — warna hijau */}
        <div className="kpi-rft p-2 px-3 flex flex-col justify-between industrial-border rounded-sm h-[80px]">
          <span className="text-[12px] uppercase font-bold text-white/95 self-start">QTY PASS</span>
          <span className="text-[30px] font-bold text-center self-center my-auto text-white tracking-wide">
            {formatNumberIndo(cfaQtyPass)}
          </span>
        </div>

        {/* Row 2 */}
        {/* 4. TOTAL MINOR — warna kuning */}
        <div className="kpi-yellow p-2 px-3 flex flex-col justify-between industrial-border rounded-sm h-[80px]">
          <span className="text-[12px] uppercase font-bold text-white/95 self-start">TOTAL MINOR</span>
          <span className="text-[30px] font-bold text-center self-center my-auto text-white tracking-wide">
            {formatNumberIndo(kpis.sheetMinor)}
          </span>
        </div>
        {/* 5. TOTAL MAJOR — warna orange */}
        <div className="kpi-b-grade p-2 px-3 flex flex-col justify-between industrial-border rounded-sm h-[80px]">
          <span className="text-[12px] uppercase font-bold text-white/95 self-start">TOTAL MAJOR</span>
          <span className="text-[30px] font-bold text-center self-center my-auto text-white tracking-wide">
            {formatNumberIndo(kpis.sheetMajor)}
          </span>
        </div>
        {/* 6. TOTAL CRITICAL — warna merah */}
        <div className="kpi-critical-red p-2 px-3 flex flex-col justify-between industrial-border rounded-sm h-[80px]">
          <span className="text-[12px] uppercase font-bold text-white/95 self-start">TOTAL CRITICAL</span>
          <span className="text-[30px] font-bold text-center self-center my-auto text-white tracking-wide">
            {formatNumberIndo(kpis.sheetCritical)}
          </span>
        </div>
      </div>
    );
  }

  // ── Default: PSI / T1QM — layout lama ──
  return (
    <div className="grid grid-cols-3 gap-2">
        {/* Row 1 */}
        <div className="kpi-qty-inspection p-2 px-3 flex flex-col justify-between industrial-border rounded-sm h-[80px]">
          <span className="text-[12px] uppercase font-bold text-white/95 self-start">QTY INSPECTION</span>
          <span className="text-[30px] font-bold text-center self-center my-auto text-white tracking-wide">
            {formatNumberIndo(kpis.qtyInspection ?? kpis.qtyOrder)}
          </span>
        </div>
        <div className="kpi-qty-defect p-2 px-3 flex flex-col justify-between industrial-border rounded-sm h-[80px]">
          <span className="text-[12px] uppercase font-bold text-white/95 self-start">QTY DEFECT</span>
          <span className="text-[30px] font-bold text-center self-center my-auto text-white tracking-wide">
            {formatNumberIndo(kpis.qtyDefect)}
          </span>
        </div>
        <div className="kpi-rft p-2 px-3 flex flex-col justify-between industrial-border rounded-sm h-[80px]">
          <span className="text-[12px] uppercase font-bold text-white/95 self-start">RFT</span>
          <span className="text-[30px] font-bold text-center self-center my-auto text-white tracking-wide">
            {formatPercentIndo(kpis.rft)}
          </span>
        </div>

        {/* Row 2 */}
        <div className="kpi-a-grade p-2 px-3 flex flex-col justify-between industrial-border rounded-sm h-[80px]">
          <span className="text-[12px] uppercase font-bold text-white/95 self-start">A-GRADE</span>
          <span className="text-[30px] font-bold text-center self-center my-auto text-white tracking-wide">
            {formatNumberIndo(kpis.aGrade)}
          </span>
        </div>
        <div className="kpi-b-grade p-2 px-3 flex flex-col justify-between industrial-border rounded-sm h-[80px]">
          <span className="text-[12px] uppercase font-bold text-white/95 self-start">B-GRADE</span>
          <span className="text-[30px] font-bold text-center self-center my-auto text-white tracking-wide">
            {kpis.bGrade !== '-' ? formatNumberIndo(kpis.bGrade) : '-'}
          </span>
        </div>
        <div className={`p-2 px-3 flex flex-col justify-between industrial-border rounded-sm h-[80px] ${is3rdParty ? 'kpi-pass-rate-blue' : 'kpi-defect-rate-red'}`}>
          <span className="text-[12px] uppercase font-bold text-white/95 self-start">
            {activeTab === 'T1QM' ? 'PASS RATE T1QM' : is3rdParty ? 'PASS RATE BUILDING' : 'DEFECT RATE'}
          </span>
          <span className="text-[30px] font-bold text-center self-center my-auto text-white tracking-wide">
            {formatPercentIndo(kpis.defectRate)}
          </span>
        </div>
      </div>
  );
};

export default KPIBox;
