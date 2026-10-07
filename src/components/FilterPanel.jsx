import DateRangePicker from './DateRangePicker';
import MultiSelect from './MultiSelect';

const FilterPanel = ({ filters, options, onFilterChange, onDateRangeChange, onExport, onExportPDF, onExportPsiEmail, onExportExcel, onSummary, viewMode, activeTab, onTabChange }) => {
  return (
    <div className="flex flex-col gap-0">
      {/* Row 0: Menu Tabs */}
      <div className="flex flex-wrap items-center gap-0">
        <button
          onClick={() => onTabChange('CFA')}
          className={`px-6 py-2.5 font-bold text-sm uppercase tracking-wider rounded-t-lg transition-all border border-b-0 ${activeTab === 'CFA'
            ? 'bg-primary text-white border-white/30'
            : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80'
            }`}
        >
          CFA REPORT
        </button>
        <button
          onClick={() => onTabChange('CFA VALIDATION')}
          className={`px-6 py-2.5 font-bold text-sm uppercase tracking-wider rounded-t-lg transition-all relative border border-b-0 ${activeTab === 'CFA VALIDATION'
            ? 'bg-primary text-white border-white/30'
            : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80'
            }`}
        >
          CFA Validation By T1QM
          <span className="absolute -top-2 -right-2 bg-amber-500 text-amber-950 text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg animate-pulse">ON PROGRESS</span>
        </button>
        <button
          onClick={() => onTabChange('PSI LV.1')}
          className={`px-6 py-2.5 font-bold text-sm uppercase tracking-wider rounded-t-lg transition-all border border-b-0 ${activeTab === 'PSI LV.1'
            ? 'bg-primary text-white border-white/30'
            : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80'
            }`}
        >
          PSI LV.1
        </button>
        <button
          onClick={() => onTabChange('PSI LV.2')}
          className={`px-6 py-2.5 font-bold text-sm uppercase tracking-wider rounded-t-lg transition-all border border-b-0 ${activeTab === 'PSI LV.2'
            ? 'bg-primary text-white border-white/30'
            : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80'
            }`}
        >
          PSI LV.2
        </button>
        <button
          onClick={() => onTabChange('3rd Party')}
          className={`px-6 py-2.5 font-bold text-sm uppercase tracking-wider rounded-t-lg transition-all border border-b-0 ${activeTab === '3rd Party'
            ? 'bg-primary text-white border-white/30'
            : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80'
            }`}
        >
          AQL 3rd Party
        </button>
        <button
          onClick={() => onTabChange('T1QM')}
          className={`px-6 py-2.5 font-bold text-sm uppercase tracking-wider rounded-t-lg transition-all relative border border-b-0 ${activeTab === 'T1QM'
            ? 'bg-primary text-white border-white/30'
            : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80'
            }`}
        >
          T1QM
        </button>
        {viewMode === 'summary' && (
          <button
            onClick={() => onTabChange('SUMMARY RFT')}
            className={`px-6 py-2.5 font-bold text-sm uppercase tracking-wider rounded-t-lg transition-all border border-b-0 ${activeTab === 'SUMMARY RFT'
              ? 'bg-primary text-white border-white/30'
              : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80'
              }`}
          >
            Summary RFT
          </button>
        )}
        {/* Spacer + action buttons pushed to right */}
        <div className="hidden lg:block flex-1" />
        <div className="ml-auto flex flex-wrap items-center gap-2 pb-1">
          <button
            onClick={onSummary}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-5 rounded transition-all shadow-lg uppercase text-[10px]"
          >
            {viewMode === 'summary' ? '← Dashboard' : 'Summary'}
          </button>
          {(activeTab === 'PSI LV.1' || activeTab === 'PSI LV.2' || activeTab === '3rd Party') && (
            <button
              onClick={onExportPsiEmail}
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-1.5 px-5 rounded transition-all shadow-lg uppercase text-[10px]"
            >
              EXPORT PDF EMAIL
            </button>
          )}
          <button
            onClick={onExportPDF || onExport}
            className="bg-accent hover:bg-orange-600 text-white font-bold py-1.5 px-5 rounded transition-all shadow-lg uppercase text-[10px]"
          >
            Export PDF
          </button>
          <button
            onClick={onExportExcel || onExport}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-5 rounded transition-all shadow-lg uppercase text-[10px]"
          >
            Export EXCEL
          </button>
        </div>
      </div>

      {/* Row 1: Title + Filters inline */}
      <div className="flex items-end gap-3 bg-primary/80 border border-white/20 rounded-b-lg rounded-tr-lg px-4 py-2.5">
        {/* Title */}
        <div className="flex items-center gap-2 mr-2 shrink-0 pb-1">
          <h1 className="text-base font-bold uppercase tracking-wide whitespace-nowrap">
            {activeTab === 'CFA' ? 'CFA REPORT' : activeTab === 'CFA VALIDATION' ? 'CFA VALIDATION BY T1QM' : activeTab === '3rd Party' ? 'AQL 3rd Party' : activeTab === 'T1QM' ? 'T1QM' : activeTab === 'SUMMARY RFT' ? 'Summary RFT' : activeTab === 'PSI LV.2' ? 'PSI LV.2' : activeTab === 'PSI LV.1' ? 'PSI LV.1' : 'QUALITY INSPECTION PERFORMANCE'}
          </h1>

        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-2 flex-1">
          <div className="flex flex-col">
            <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1 tracking-wider ml-1">
              {(activeTab === 'CFA' || activeTab === 'CFA VALIDATION') ? 'INSPECTION DATE' : 'DATE'}
            </label>
            <DateRangePicker
              startDate={filters.startDate}
              endDate={filters.endDate}
              onRangeChange={onDateRangeChange}
            />
          </div>
          <MultiSelect
            label="FACTORY"
            options={options.factory || []}
            selected={filters.factory}
            onChange={(val) => onFilterChange('factory', val)}
          />
          {activeTab === 'T1QM' && (
            <MultiSelect
              label="TYPE INSPECTION"
              options={options.typeInspection || []}
              selected={filters.typeInspection || []}
              onChange={(val) => onFilterChange('typeInspection', val)}
            />
          )}
          {activeTab !== 'T1QM' && (
            <MultiSelect
              label="CELL"
              options={options.cell || []}
              selected={filters.cell}
              onChange={(val) => onFilterChange('cell', val)}
            />
          )}
          <MultiSelect
            label="MODEL"
            options={options.model || []}
            selected={filters.model}
            onChange={(val) => onFilterChange('model', val)}
          />
          <MultiSelect
            label="INSPECTOR"
            options={options.inspector || []}
            selected={filters.inspector}
            onChange={(val) => onFilterChange('inspector', val)}
          />
          <MultiSelect
            label="PO"
            options={options.po || []}
            selected={filters.po}
            onChange={(val) => onFilterChange('po', val)}
          />
          {(activeTab === 'PSI LV.2' || activeTab === '3rd Party') && (
            <MultiSelect
              label="DEFECT NAME"
              options={options.defectName || []}
              selected={filters.defectName}
              onChange={(val) => onFilterChange('defectName', val)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
