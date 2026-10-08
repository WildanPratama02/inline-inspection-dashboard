import React, { useState, useEffect, useRef } from 'react';

const MultiSelect = ({ label, options, selected, onChange, theme = 'dark' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);
  const isLight = theme === 'light';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (option) => {
    let newSelected;
    if (selected.includes(option)) {
      newSelected = selected.filter(item => item !== option);
    } else {
      newSelected = [...selected, option];
    }
    onChange(newSelected);
  };

  const handleSelectAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  const filteredOptions = (options || []).filter(opt => 
    String(opt).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayLabel = (selected || []).length === 0 || (selected || []).length === (options || []).length
    ? `ALL ${label}`
    : `${(selected || []).length} ${label} Selected`;

  return (
    <div className="relative flex-1 min-w-[150px]" ref={wrapperRef}>
      <label className={`block text-[10px] uppercase font-bold mb-1 tracking-wider ml-1 ${isLight ? 'text-slate-700' : 'text-gray-400'}`}>
        {label}
      </label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-1.5 text-xs flex justify-between items-center rounded transition-colors border font-semibold ${
          isLight
            ? 'bg-white border-slate-300 text-slate-800 hover:border-blue-500 shadow-sm'
            : 'bg-[#1A0F5A] border-white/20 text-white hover:border-accent'
        }`}
      >
        <span className="truncate">{displayLabel}</span>
        <svg className={`w-3 h-3 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''} ${isLight ? 'text-slate-600' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className={`absolute top-full left-0 right-0 mt-1 shadow-2xl z-[60] rounded-lg overflow-hidden animate-fade-in max-h-[300px] flex flex-col border ${
          isLight
            ? 'bg-white border-slate-300 text-slate-800'
            : 'bg-[#1A0F5A] border-white/20 text-white'
        }`}>
          <div className={`p-2 border-b ${isLight ? 'border-slate-200 bg-slate-100' : 'border-white/10 bg-[#2A1F6A]'}`}>
            <input
              type="text"
              placeholder="Search..."
              className={`w-full text-[10px] px-2 py-1 rounded outline-none border ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-blue-500'
                  : 'bg-[#0A0520] border-white/10 text-white placeholder-gray-400 focus:border-accent'
              }`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
            <button
              onClick={handleSelectAll}
              className={`w-full text-left px-2 py-1.5 text-[10px] flex items-center gap-2 border-b mb-1 ${
                isLight
                  ? 'hover:bg-slate-100 border-slate-200 text-slate-800'
                  : 'hover:bg-white/10 border-white/5 text-white'
              }`}
            >
              <div className={`w-3 h-3 rounded border flex items-center justify-center ${selected.length === options.length ? 'bg-blue-600 border-blue-600' : (isLight ? 'border-slate-400' : 'border-white/30')}`}>
                {selected.length === options.length && <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}
              </div>
              <span className="font-bold">SELECT ALL</span>
            </button>
            
            {filteredOptions.length === 0 ? (
              <div className={`px-2 py-3 text-[10px] text-center ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>No options found</div>
            ) : (
              filteredOptions.map(opt => (
                <button
                  key={opt}
                  onClick={() => handleToggle(opt)}
                  className={`w-full text-left px-2 py-1.5 text-[10px] flex items-center gap-2 transition-colors ${
                    isLight
                      ? 'hover:bg-blue-50 text-slate-800'
                      : 'hover:bg-white/10 text-white'
                  }`}
                >
                  <div className={`w-3 h-3 rounded border flex items-center justify-center ${selected.includes(opt) ? 'bg-blue-600 border-blue-600' : (isLight ? 'border-slate-400' : 'border-white/30')}`}>
                    {selected.includes(opt) && <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}
                  </div>
                  <span className="truncate">{opt}</span>
                </button>
              ))
            )}
          </div>
          
          <div className={`p-2 border-t flex justify-between items-center ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-[#2A1F6A]'}`}>
            <span className={`text-[9px] ${isLight ? 'text-slate-500 font-medium' : 'text-gray-400'}`}>{selected.length} selected</span>
            <button 
              onClick={() => setIsOpen(false)}
              className="bg-blue-600 text-white text-[9px] px-3 py-1 rounded font-bold hover:bg-blue-700 transition-colors"
            >
              DONE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelect;
