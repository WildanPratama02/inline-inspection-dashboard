import React, { useState, useEffect, useMemo, useRef } from 'react';
import Header from '../components/Header';
import FilterPanel from '../components/FilterPanel';
import KPIBox from '../components/KPIBox';
import DefectChart from '../components/DefectChart';
import DefectImages from '../components/DefectImages';
import SummaryView from '../components/SummaryView';
import DashboardContentView from '../components/DashboardContentView';
import SummaryPassRateTable from '../components/SummaryPassRateTable';
import CfaValidationDashboard from '../components/CfaValidationDashboard';
import WeeklyExportController from '../components/WeeklyExportController';
import DashboardExportController from '../components/DashboardExportController';
import PsiEmailExportController from '../components/PsiEmailExportController';
import AqlEmailExportController from '../components/AqlEmailExportController';
import ExportModal from '../components/ExportModal';
import { exportToExcelRFT, exportToExcelDetail } from '../utils/excelExportUtils';
import { fetchData } from '../services/googleSheetService';
import {
  normalizeKey,
  findKey,
  parseNumber,
  toLocalISODate,
  formatDateStr,
  getInspectorType,
  getT1qmInspectionTypes,
  isT1qmDateAnomaly,
  isT1qmType,
  matchesT1qmInspectionType,
  normalizeDefectName
} from '../utils/dataUtils';
import { exportToPDF } from '../utils/exportPDF';

const Dashboard = () => {
  const [data, setData] = useState({ raw: [], summary: [] });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('dashboard');
  const [activeTab, setActiveTab] = useState('PSI LV.2');
  const [isExportingWeekly, setIsExportingWeekly] = useState(false);
  const [isExportingDashboard, setIsExportingDashboard] = useState(false);
  const [isExportingPsiEmail, setIsExportingPsiEmail] = useState(false);
  const [isExportingAqlEmail, setIsExportingAqlEmail] = useState(false);
  const [exportStatus, setExportStatus] = useState({ visible: false, message: '', progress: 0, total: 0 });
  // Dynamic map: { 'INSPECTOR NAME': 'CFA' | 'PSI' | '3rd Party' } — built from Google Sheet type_inspection column
  const [inspectorTypeMap, setInspectorTypeMap] = useState({});
  const [filters, setFilters] = useState({
    startDate: 'ALL',
    endDate: 'ALL',
    factory: [],
    cell: [],
    model: [],
    po: [],
    inspector: [],
    inspectorType: [],
    defectName: [],
    typeInspection: []
  });

  const rawDataRef = useRef([]);

  // Helper: resolve inspector type using dynamic sheet map first, then static map as fallback
  const resolveInspectorType = (inspName, item) => {
    // 1. Try the type_inspection column directly from the row item
    if (item) {
      const typeVal = item.type_inspection || item.inspection_type || item.type_inspector || '';
      if (typeVal && typeVal.trim() !== '' && typeVal.trim() !== '-') {
        const v = typeVal.trim().toUpperCase();
        if (isT1qmType(v)) return 'T1QM';
        if (v.replace(/\s+/g, '').startsWith('T1QM')) return null;
        if (v.includes('CFA VALIDATION')) return 'CFA VALIDATION';
        if (v.includes('CFA')) return 'CFA';
        if (v === 'PSI LV.1' || v.includes('PSI LV.1') || v.includes('PSI LV. 1') || v.includes('PSI LV1')) return 'PSI LV.1';
        if (v === 'PSI' || v.includes('PSI LV.2') || v.includes('PSI LV. 2') || v.includes('PSI LV2')) return 'PSI LV.2';
        if (v.includes('AQL') || v.includes('3RD PARTY') || v.includes('3R PARTY')) return '3rd Party';
        // '100% Inline' — fall through to name lookup
      }
    }
    // 2. Try the dynamic map built from sheet data
    if (inspName) {
      const norm = String(inspName).trim().toUpperCase();
      if (inspectorTypeMap[norm]) return inspectorTypeMap[norm];
    }
    // 3. Fall back to static map
    return getInspectorType(inspName, item);
  };


  useEffect(() => {
    const loadData = async () => {
      const result = await fetchData();
      setData({ raw: result.rawData, summary: result.summaryData });
      rawDataRef.current = result.rawData;

      // Setelah data dimuat, set default tanggal ke hari ini
      // Jika tidak ada data hari ini, fallback ke tanggal terbaru di data
      const today = toLocalISODate(new Date());

      if (result.rawData && result.rawData.length > 0) {
        const firstItem = result.rawData[0];
        const dateKey = Object.keys(firstItem).find(k =>
          k.toLowerCase().includes('date')
        );

        if (dateKey) {
          // Normalisasi semua tanggal di data ke format YYYY-MM-DD
          const allDates = result.rawData
            .map(item => {
              const ds = item[dateKey];
              if (!ds) return null;
              if (ds.includes('/')) {
                const [d, m, y] = ds.split('/').map(Number);
                return toLocalISODate(new Date(y, m - 1, d));
              }
              const parsed = new Date(ds);
              return isNaN(parsed.getTime()) ? null : toLocalISODate(parsed);
            })
            .filter(Boolean);

          const uniqueDates = [...new Set(allDates)].sort();
          const hasToday = uniqueDates.includes(today);
          const defaultDate = hasToday ? today : uniqueDates[uniqueDates.length - 1];

          if (defaultDate) {
            setFilters(prev => ({ ...prev, startDate: defaultDate, endDate: defaultDate }));
          }
        }
      }

      // Build dynamic inspector-type map from Google Sheet type_inspection column
      const dynamicMap = {};
      if (result.rawData && result.rawData.length > 0) {
        result.rawData.forEach(item => {
          const name = (item.inspector || '').trim().toUpperCase();
          const typeVal = (item.type_inspection || item.inspection_type || '').trim().toUpperCase();
          if (name && typeVal && typeVal !== '' && typeVal !== '-' && !dynamicMap[name]) {
            if (isT1qmType(typeVal)) dynamicMap[name] = 'T1QM';
            else if (typeVal.includes('CFA VALIDATION')) dynamicMap[name] = 'CFA VALIDATION';
            else if (typeVal.includes('CFA')) dynamicMap[name] = 'CFA';
            else if (typeVal === 'PSI LV.1' || typeVal.includes('PSI LV.1') || typeVal.includes('PSI LV. 1') || typeVal.includes('PSI LV1')) dynamicMap[name] = 'PSI LV.1';
            else if (typeVal === 'PSI' || typeVal.includes('PSI LV.2') || typeVal.includes('PSI LV. 2') || typeVal.includes('PSI LV2')) dynamicMap[name] = 'PSI LV.2';
            else if (typeVal.includes('AQL') || typeVal.includes('3RD PARTY') || typeVal.includes('3R PARTY')) dynamicMap[name] = '3rd Party';
            // '100% Inline' -> will fall back to static map
          }
        });
      }
      setInspectorTypeMap(dynamicMap);

      setLoading(false);
    };
    loadData();
  }, []);

  const options = useMemo(() => {
    if (!data.raw || data.raw.length === 0) return {};

    // Get a representative item for the active tab to correctly identify filter keys
    const firstItem = data.raw.find(item => resolveInspectorType(item.inspector, item) === activeTab) || data.raw[0] || {};
    const dateKey = findKey(firstItem, 'date');
    
    // Pre-find keys for all categorical filters
    const filterKeys = {};
    ['factory', 'cell', 'model', 'po', 'inspector', 'article'].forEach(k => {
      filterKeys[k] = findKey(firstItem, k, 'building');
    });

    // Also pre-find defect keys for dynamic defect filter
    const defectNameKeys = [];
    const defectQtyKeys = [];
    for (let i = 1; i <= 25; i++) {
      defectNameKeys[i] = findKey(firstItem, `defect_name_${i}`, `defect name ${i}`, `defectname${i}`);
      defectQtyKeys[i] = findKey(firstItem, `qty_defect_${i}`, `qty defect ${i}`, `qtydefect${i}`);
    }
    const inspectorKey = filterKeys['inspector'];
  const typeInspectionKey = findKey(firstItem, 'type_inspection', 'type inspection');

    const checkDateInRange = (item) => {
      if (!dateKey) return true;
      const dateStr = item[dateKey];
      if (!dateStr) return false;

      let itemDate;
      if (dateStr.includes('/')) {
        const [d, m, y] = dateStr.split('/').map(Number);
        itemDate = new Date(y, m - 1, d);
      } else {
        itemDate = new Date(dateStr);
      }

      if (isNaN(itemDate.getTime())) return false;
      itemDate.setHours(0, 0, 0, 0);
      const itemTime = itemDate.getTime();

      const start = filters.startDate !== 'ALL' ? new Date(filters.startDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      const startTime = start ? start.getTime() : -Infinity;

      const end = filters.endDate !== 'ALL' ? new Date(filters.endDate) : null;
      if (end) end.setHours(23, 59, 59, 999);
      const endTime = end ? end.getTime() : Infinity;

      return itemTime >= startTime && itemTime <= endTime;
    };

    const getOptionsForField = (fieldKey) => {
      const optSet = new Set();
      const targetItemKey = filterKeys[fieldKey];
      if (!targetItemKey) return [];

      data.raw.forEach(item => {
        // Always filter options by activeTab (unless SUMMARY RFT)
        const inspNameOpt = inspectorKey ? item[inspectorKey] : null;
        const iTypeOpt = resolveInspectorType(inspNameOpt, item);
        if (activeTab !== 'SUMMARY RFT' && iTypeOpt !== activeTab) return;
        if (activeTab === 'T1QM' && isT1qmDateAnomaly(item[dateKey])) return;
        if (activeTab === 'T1QM' && typeInspectionKey && !matchesT1qmInspectionType(item[typeInspectionKey], filters.typeInspection)) return;

        // Also check manual inspectorType filter if set
        if (filters.inspectorType && filters.inspectorType.length > 0) {
          if (!filters.inspectorType.includes(iTypeOpt)) return;
        }

        // Only show options that have data in the active date range
        const dateOk = checkDateInRange(item);
        if (!dateOk) return;

        const otherFiltersOk = Object.keys(filterKeys).every(fKey => {
          if (fKey === fieldKey) return true;
          const filterValue = filters[fKey];
          if (Array.isArray(filterValue) && filterValue.length > 0) {
            const itemKey = filterKeys[fKey];
            return itemKey && filterValue.includes(String(item[itemKey]));
          }
          return true;
        });

        if (otherFiltersOk) {
          const val = item[targetItemKey];
          if (val && val !== '-') {
            optSet.add(val);
          }
        }
      });
      return Array.from(optSet).sort();
    };

    const getOptionsForDefectName = () => {
      const optSet = new Set();
      data.raw.forEach(item => {
        const inspNameOpt = inspectorKey ? item[inspectorKey] : null;
        const iTypeOpt = resolveInspectorType(inspNameOpt, item);
        if (activeTab !== 'SUMMARY RFT' && iTypeOpt !== activeTab) return;
        if (activeTab === 'T1QM' && isT1qmDateAnomaly(item[dateKey])) return;

        if (filters.inspectorType && filters.inspectorType.length > 0) {
          if (!filters.inspectorType.includes(iTypeOpt)) return;
        }

        const dateOk = checkDateInRange(item);
        if (!dateOk) return;

        const otherFiltersOk = Object.keys(filterKeys).every(fKey => {
          const filterValue = filters[fKey];
          if (Array.isArray(filterValue) && filterValue.length > 0) {
            const itemKey = filterKeys[fKey];
            return itemKey && filterValue.includes(String(item[itemKey]));
          }
          return true;
        });

        if (otherFiltersOk) {
          for (let i = 1; i <= 25; i++) {
            const nKey = defectNameKeys[i];
            const qKey = defectQtyKeys[i];
            if (nKey && qKey) {
              const name = item[nKey];
              const qty = parseNumber(item[qKey]);
              if (name && name !== '-' && name !== 'NO DATA' && qty > 0) {
                optSet.add(activeTab === 'T1QM' ? normalizeDefectName(name) : name.trim());
              }
            }
          }
        }
      });
      return Array.from(optSet).sort();
    };

    return {
      factory: getOptionsForField('factory'),
      cell: getOptionsForField('cell'),
      model: getOptionsForField('model'),
      po: getOptionsForField('po'),
      inspector: getOptionsForField('inspector'),
      article: getOptionsForField('article'),
      defectName: getOptionsForDefectName(),
      typeInspection: activeTab === 'T1QM' ? getT1qmInspectionTypes(data.raw) : []
    };
  }, [data.raw, filters, activeTab, inspectorTypeMap]);


  const filteredData = useMemo(() => {
    if (!data.raw || data.raw.length === 0) return [];

    const firstItem = data.raw.find(item => resolveInspectorType(item.inspector, item) === activeTab) || data.raw[0] || {};
    const dateKey = findKey(firstItem, 'date');

    // Pre-find keys for each active filter
    const activeFilterKeys = {};
    Object.keys(filters).forEach(fKey => {
      if (fKey !== 'startDate' && fKey !== 'endDate' && fKey !== 'inspectorType' && fKey !== 'defectName') {
        activeFilterKeys[fKey] = findKey(firstItem, fKey);
      }
    });

    const defectNameKeys = [];
    const defectQtyKeys = [];
    if (filters.defectName && filters.defectName.length > 0) {
      for (let i = 1; i <= 25; i++) {
        defectNameKeys[i] = findKey(firstItem, `defect_name_${i}`, `defect name ${i}`, `defectname${i}`);
        defectQtyKeys[i] = findKey(firstItem, `qty_defect_${i}`, `qty defect ${i}`, `qtydefect${i}`);
      }
    }
    const inspectorKeyFD = findKey(firstItem, 'inspector');

    const checkDateInRange = (item) => {
      if (!dateKey) return true;
      const dateStr = item[dateKey];
      if (!dateStr) return false;

      let itemDate;
      if (dateStr.includes('/')) {
        const [d, m, y] = dateStr.split('/').map(Number);
        itemDate = new Date(y, m - 1, d);
      } else {
        itemDate = new Date(dateStr);
      }

      if (isNaN(itemDate.getTime())) return false;
      itemDate.setHours(0, 0, 0, 0);
      const itemTime = itemDate.getTime();

      const start = filters.startDate !== 'ALL' ? new Date(filters.startDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      const startTime = start ? start.getTime() : -Infinity;

      const end = filters.endDate !== 'ALL' ? new Date(filters.endDate) : null;
      if (end) end.setHours(23, 59, 59, 999);
      const endTime = end ? end.getTime() : Infinity;

      return itemTime >= startTime && itemTime <= endTime;
    };

    return data.raw.filter(item => {
      // 1. Inspector Type filter
      if (filters.inspectorType && filters.inspectorType.length > 0) {
        const inspName = inspectorKeyFD ? item[inspectorKeyFD] : null;
        const iType = resolveInspectorType(inspName, item);
        if (!filters.inspectorType.includes(iType)) return false;
      }

      // 2. General filters (Factory, Cell, etc.)
      const matchGeneral = Object.keys(activeFilterKeys).every(fKey => {
        const filterValue = filters[fKey];
        if (Array.isArray(filterValue) && filterValue.length > 0) {
          const itemKey = activeFilterKeys[fKey];
          if (fKey === 'typeInspection') return matchesT1qmInspectionType(item[itemKey], filterValue);
          return itemKey && filterValue.includes(String(item[itemKey]));
        }
        return true;
      });
      if (!matchGeneral) return false;

      // 3. Defect Name filter intentionally omitted here (processed in DashboardContentView)

      // 4. Date range filter
      if (filters.startDate === 'ALL' && filters.endDate === 'ALL') return true;
      return checkDateInRange(item);
    });
  }, [data.raw, filters]);

  // Derived data specifically for Summary (PSI only)
  const psiFilteredData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    const firstItem = data.raw[0] || {};
    const inspectorKey = findKey(firstItem, 'inspector');
    return filteredData.filter(item => {
      const inspName = inspectorKey ? item[inspectorKey] : null;
      return resolveInspectorType(inspName, item) === 'PSI LV.2';
    });
  }, [filteredData, data.raw, inspectorTypeMap]);

  // Apply activeTab auto-filter on top of filteredData
  const tabFilteredData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    if (activeTab === 'SUMMARY RFT') return filteredData;
    const firstItem = data.raw[0] || {};
    const inspectorKey = findKey(firstItem, 'inspector');
    const dateKey = findKey(firstItem, 'date');
    return filteredData.filter(item => {
      const inspName = inspectorKey ? item[inspectorKey] : null;
      if (resolveInspectorType(inspName, item) !== activeTab) return false;
      return activeTab !== 'T1QM' || !isT1qmDateAnomaly(item[dateKey]);
    });
  }, [filteredData, activeTab, data.raw, inspectorTypeMap]);

  // Effective filters including activeTab's inspectorType
  const effectiveFilters = useMemo(() => ({
    ...filters,
    inspectorType: [activeTab]
  }), [filters, activeTab]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const nextFilters = { ...prev, [key]: value };

      if (!data.raw || data.raw.length === 0) return nextFilters;
      const firstItem = data.raw.find(item => resolveInspectorType(item.inspector, item) === activeTab) || data.raw[0] || {};
      const cellKey = findKey(firstItem, 'cell');
      const factoryKey = findKey(firstItem, 'factory', 'building');
      const modelKey = findKey(firstItem, 'model');
      const poKey = findKey(firstItem, 'po');
      const articleKey = findKey(firstItem, 'article');
      const inspectorKeyLocal = findKey(firstItem, 'inspector');

      // ── FACTORY changed: reset dependent filters so data shows for selected factory/factories ──
      // Cell/model/po options will be cross-filtered by getOptionsForField automatically.
      if (key === 'factory') {
        nextFilters.cell = [];
        nextFilters.model = [];
        nextFilters.po = [];
        nextFilters.article = [];
        nextFilters.inspector = [];
        nextFilters.defectName = [];
      }

      if (key === 'typeInspection') {
        nextFilters.factory = [];
        nextFilters.cell = [];
        nextFilters.model = [];
        nextFilters.po = [];
        nextFilters.inspector = [];
        nextFilters.article = [];
        nextFilters.defectName = [];
      }

      // ── CELL selected: auto-propagate factory ──
      if (key === 'cell' && Array.isArray(value) && value.length > 0) {
        if (cellKey && factoryKey) {
          const inferredFactories = new Set();
          data.raw.forEach(item => {
            const cellVal = String(item[cellKey] || '');
            const factoryVal = String(item[factoryKey] || '');
            if (value.includes(cellVal) && factoryVal) {
              inferredFactories.add(factoryVal);
            }
          });
          if (inferredFactories.size > 0) {
            nextFilters.factory = Array.from(inferredFactories);
          }
        }
      }

      // ── Smart date expansion ──
      // If the selected factory/cell has no data in current date range, expand to ALL
      if (['cell', 'factory', 'model', 'po', 'inspector', 'article', 'defectName'].includes(key) && Array.isArray(value) && value.length > 0) {
        const dateKey = findKey(firstItem, 'date');
        const filterColKey = findKey(firstItem, key);
        if (dateKey && filterColKey) {
          const startDate = nextFilters.startDate;
          const endDate = nextFilters.endDate;

          const hasDataInRange = data.raw.some(item => {
            const itemVal = String(item[filterColKey] || '');
            if (!value.includes(itemVal)) return false;

            if (startDate === 'ALL' || endDate === 'ALL') return true;
            const dateStr = item[dateKey];
            if (!dateStr) return false;
            let itemDate;
            if (dateStr.includes('/')) {
              const [d, m, y] = dateStr.split('/').map(Number);
              itemDate = new Date(y, m - 1, d);
            } else {
              itemDate = new Date(dateStr);
            }
            if (isNaN(itemDate.getTime())) return false;
            itemDate.setHours(0, 0, 0, 0);
            const start = new Date(startDate); start.setHours(0, 0, 0, 0);
            const end = new Date(endDate); end.setHours(23, 59, 59, 999);
            return itemDate >= start && itemDate <= end;
          });

          if (!hasDataInRange) {
            nextFilters.startDate = 'ALL';
            nextFilters.endDate = 'ALL';
          }
        }
      }

      return nextFilters;
    });
  };


  const handleDateRangeChange = (start, end) => {
    setFilters(prev => ({
      ...prev,
      startDate: start,
      endDate: end,
      // Reset all categorical filters to ALL when date changes
      factory: [],
      cell: [],
      model: [],
      po: [],
      inspector: [],
      article: [],
      typeInspection: [],
      defectName: [],
    }));
  };

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);

    // Find default date to reset back to initial state
    let defaultDate = 'ALL';
    if (newTab !== 'T1QM' && data.raw && data.raw.length > 0) {
      const firstItem = data.raw[0];
      const dateKey = Object.keys(firstItem).find(k => k.toLowerCase().includes('date'));
      if (dateKey) {
        const today = toLocalISODate(new Date());
        const allDates = data.raw
          .map(item => {
            const ds = item[dateKey];
            if (!ds) return null;
            if (ds.includes('/')) {
              const [d, m, y] = ds.split('/').map(Number);
              return toLocalISODate(new Date(y, m - 1, d));
            }
            const parsed = new Date(ds);
            return isNaN(parsed.getTime()) ? null : toLocalISODate(parsed);
          })
          .filter(Boolean);
        const uniqueDates = [...new Set(allDates)].sort();
        const hasToday = uniqueDates.includes(today);
        defaultDate = hasToday ? today : uniqueDates[uniqueDates.length - 1];
      }
    }

    setFilters({
      startDate: defaultDate,
      endDate: defaultDate,
      factory: [],
      cell: [],
      model: [],
      po: [],
      inspector: [],
      inspectorType: [],
      typeInspection: [],
      defectName: []
    });
  };

  if (loading) return <div className="flex items-center justify-center h-screen text-2xl">LOADING DASHBOARD...</div>;

  return (
    <div className="bg-[#0A0520] min-h-screen w-full flex flex-col items-stretch p-3 md:p-5 overflow-x-hidden">
      {/* Non-canvas filter area */}
      <div className="w-full mb-3">
        <FilterPanel
          filters={filters}
          options={options}
          onFilterChange={handleFilterChange}
          onDateRangeChange={handleDateRangeChange}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onExportPsiEmail={() => {
            if (activeTab === '3rd Party') {
              setIsExportingAqlEmail(true);
            } else {
              setIsExportingPsiEmail(true);
            }
          }}
          onExportPDF={async () => {
            if (viewMode === 'summary') {
              setExportStatus({ visible: true, message: 'Capturing summary…', progress: 0, total: 0 });
              await exportToPDF('summary-canvas', `Summary_Export.pdf`);
              setExportStatus({ visible: false, message: '', progress: 0, total: 0 });
            } else {
              setIsExportingDashboard(true);
            }
          }}
          onExportExcel={() => {
            if (activeTab === 'SUMMARY RFT') {
              exportToExcelRFT(tabFilteredData, data.raw, resolveInspectorType, 'Summary_RFT_Report.xls');
            } else {
              const filename = `Inspection_Detail_${activeTab ? activeTab.replace(/\s+/g, '_') : 'Report'}.xls`;
              exportToExcelDetail(tabFilteredData, data.raw, resolveInspectorType, activeTab, filename, filters.defectName);
            }
          }}
          onSummary={() => {
            if (viewMode === 'summary') {
              if (activeTab === 'SUMMARY RFT') {
                setActiveTab('PSI LV.2');
              }
              setViewMode('dashboard');
            } else {
              setViewMode('summary');
            }
          }}
          viewMode={viewMode}
        />
      </div>

      {activeTab === 'CFA VALIDATION' ? (
        <CfaValidationDashboard rawData={data.raw} />
      ) : activeTab === 'SUMMARY RFT' ? (
        <SummaryPassRateTable data={tabFilteredData} rawData={data.raw} resolveInspectorType={resolveInspectorType} />
      ) : viewMode === 'dashboard' ? (
        <DashboardContentView id="dashboard-canvas" data={tabFilteredData} rawData={data.raw} filters={effectiveFilters} activeTab={activeTab} />
      ) : (
        <SummaryView data={tabFilteredData} rawData={data.raw} headerMetadata={{
          model: filters.model && filters.model.length > 0 ? filters.model.join(', ') : 'ALL',
          factory: filters.factory && filters.factory.length > 0 ? filters.factory.join(', ') : 'ALL',
          cell: filters.cell && filters.cell.length > 0 ? filters.cell.join(', ') : 'ALL',
          po: filters.po && filters.po.length > 0 ? filters.po.join(', ') : 'ALL',
          inspector: filters.inspector && filters.inspector.length > 0 ? filters.inspector.join(', ') : 'ALL',
          inspectorType: activeTab,
          date: filters.startDate && filters.startDate !== 'ALL'
            ? (filters.startDate === filters.endDate ? formatDateStr(filters.startDate) : `${formatDateStr(filters.startDate)} - ${formatDateStr(filters.endDate)}`)
            : 'All Time'
        }} />
      )}

      {/* Weekly PDF Export — off-screen renderer */}
      {isExportingWeekly && (
        <WeeklyExportController
          psiData={psiFilteredData}
          rawData={data.raw}
          filters={filters}
          onProgress={(msg, cur, tot) =>
            setExportStatus({ visible: true, message: msg, progress: cur, total: tot })
          }
          onDone={() => {
            setIsExportingWeekly(false);
            setExportStatus({ visible: false, message: '', progress: 0, total: 0 });
          }}
        />
      )}

      {/* Dashboard Multi-Page Export — off-screen renderer */}
      {isExportingDashboard && (
        <DashboardExportController
          filteredData={tabFilteredData}
          rawData={data.raw}
          filters={effectiveFilters}
          activeTab={activeTab}
          onProgress={(msg, cur, tot) =>
            setExportStatus({ visible: true, message: msg, progress: cur, total: tot })
          }
          onDone={() => {
            setIsExportingDashboard(false);
            setExportStatus({ visible: false, message: '', progress: 0, total: 0 });
          }}
        />
      )}

      {/* PSI Email Panoramic Export — off-screen renderer */}
      {isExportingPsiEmail && (
        <PsiEmailExportController
          psiData={psiFilteredData}
          rawData={data.raw}
          filters={filters}
          onProgress={(msg, cur, tot) =>
            setExportStatus({ visible: true, message: msg, progress: cur, total: tot })
          }
          onDone={() => {
            setIsExportingPsiEmail(false);
            setExportStatus({ visible: false, message: '', progress: 0, total: 0 });
          }}
        />
      )}

      {/* AQL 3rd Party Email Panoramic Export — off-screen renderer */}
      {isExportingAqlEmail && (
        <AqlEmailExportController
          aqlData={tabFilteredData}
          rawData={data.raw}
          filters={effectiveFilters}
          onProgress={(msg, cur, tot) =>
            setExportStatus({ visible: true, message: msg, progress: cur, total: tot })
          }
          onDone={() => {
            setIsExportingAqlEmail(false);
            setExportStatus({ visible: false, message: '', progress: 0, total: 0 });
          }}
        />
      )}

      {/* Export Loading Modal */}
      <ExportModal
        visible={exportStatus.visible}
        message={exportStatus.message}
        progress={exportStatus.progress}
        total={exportStatus.total}
      />
    </div>
  );
};

export default Dashboard;
