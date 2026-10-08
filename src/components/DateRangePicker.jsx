import React, { useState, useEffect, useRef } from 'react';

const DateRangePicker = ({ startDate, endDate, onRangeChange, theme = 'dark' }) => {
  const isLight = theme === 'light';
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState(startDate === 'ALL' ? null : new Date(startDate));
  const [tempEnd, setTempEnd] = useState(endDate === 'ALL' ? null : new Date(endDate));
  
  const [leftMonth, setLeftMonth] = useState(new Date());
  const [rightMonth, setRightMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1));
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === 'ALL') return '';
    const parts = String(dateStr).split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
    }
    
    const d = new Date(dateStr);
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handleDateClick = (date) => {
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(date);
      setTempEnd(null);
    } else {
      if (date < tempStart) {
        setTempEnd(tempStart);
        setTempStart(date);
      } else {
        setTempEnd(date);
      }
    }
  };

  const handlePresetChange = (preset) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let start = new Date(today);
    let end = new Date(today);

    switch (preset) {
      case 'TODAY':
        break;
      case 'YESTERDAY':
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;
      case 'LAST_7':
        start.setDate(today.getDate() - 6);
        break;
      case 'LAST_30':
        start.setDate(today.getDate() - 29);
        break;
      case 'THIS_MONTH':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'ALL':
        setTempStart(null);
        setTempEnd(null);
        return;
      default:
        return;
    }
    setTempStart(start);
    setTempEnd(end);
    setLeftMonth(new Date(start.getFullYear(), start.getMonth(), 1));
    setRightMonth(new Date(end.getFullYear(), end.getMonth(), 1));
  };

  const toLocalISOString = (date) => {
    if (!date) return 'ALL';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleApply = () => {
    onRangeChange(
      toLocalISOString(tempStart),
      toLocalISOString(tempEnd)
    );
    setIsOpen(false);
  };

  const renderCalendar = (monthDate, setMonthDate) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const monthsNames = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];

    const years = [];
    for (let y = 2020; y <= 2030; y++) years.push(y);

    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => setMonthDate(new Date(year, month - 1, 1))} 
            className={`p-1 rounded transition-colors ${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/10'}`}
          >
            <svg className={`w-4 h-4 ${isLight ? 'fill-slate-700' : 'fill-white'}`} viewBox="0 0 20 20"><path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"/></svg>
          </button>

          <div className="flex gap-1 items-center">
            <span className={`text-sm font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>{monthsNames[month]}</span>
            <select 
              value={year} 
              onChange={(e) => setMonthDate(new Date(parseInt(e.target.value), month, 1))}
              className={`bg-transparent text-sm font-bold outline-none cursor-pointer ${isLight ? 'text-slate-800' : 'text-white hover:text-accent'}`}
            >
              {years.map(y => <option key={y} value={y} className={isLight ? 'bg-white text-slate-800' : 'bg-primary'}>{y}</option>)}
            </select>
          </div>

          <button 
            onClick={() => setMonthDate(new Date(year, month + 1, 1))} 
            className={`p-1 rounded transition-colors ${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/10'}`}
          >
            <svg className={`w-4 h-4 ${isLight ? 'fill-slate-700' : 'fill-white'}`} viewBox="0 0 20 20"><path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"/></svg>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['M', 'S', 'S', 'R', 'K', 'J', 'S'].map(l => <div key={l} className={`text-[10px] font-bold ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{l}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array(firstDay).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
          {Array(daysInMonth).fill(null).map((_, i) => {
            const d = new Date(year, month, i + 1);
            const isSelected = (tempStart && d.getTime() === tempStart.getTime()) || (tempEnd && d.getTime() === tempEnd.getTime());
            const isInRange = tempStart && tempEnd && d > tempStart && d < tempEnd;
            const isToday = d.toDateString() === new Date().toDateString();

            return (
              <button
                key={i}
                onClick={() => handleDateClick(d)}
                className={`
                  text-xs py-1.5 rounded-full transition-all relative font-medium
                  ${isSelected ? 'bg-blue-600 text-white font-bold' : ''}
                  ${isInRange ? (isLight ? 'bg-blue-100 text-blue-900 font-semibold' : 'bg-blue-600/30 text-white') : ''}
                  ${!isSelected && isToday ? (isLight ? 'border border-blue-500 text-blue-600 font-bold' : 'border border-gray-400') : ''}
                  ${!isSelected && !isInRange ? (isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/10') : ''}
                `}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const getDisplayText = () => {
    if (startDate === 'ALL' && endDate === 'ALL') return 'Semua Waktu (Tidak Terbatas)';
    if (startDate !== 'ALL' && endDate === 'ALL') return `Mulai ${formatDate(startDate)}`;
    if (startDate === 'ALL' && endDate !== 'ALL') return `Sampai ${formatDate(endDate)}`;
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1.5 text-xs outline-none min-w-[240px] flex justify-between items-center rounded transition-colors border font-semibold ${
          isLight
            ? 'bg-white border-slate-300 text-slate-800 hover:border-blue-500 shadow-sm'
            : 'bg-[#1A0F5A] border-white/20 text-white hover:border-accent'
        }`}
      >
        <span>{getDisplayText()}</span>
        <svg className={`w-3 h-3 ml-2 transition-transform ${isLight ? 'fill-slate-600' : 'fill-white/50'}`} viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
      </button>

      {isOpen && (
        <div className={`absolute top-full left-0 mt-2 shadow-2xl z-50 p-6 min-w-[600px] rounded-xl animate-fade-in border ${
          isLight
            ? 'bg-white border-slate-300 text-slate-800'
            : 'bg-[#1A0F5A] border-white/20 text-white'
        }`}>
          <div className="flex justify-end mb-6">
            <select 
              onChange={(e) => handlePresetChange(e.target.value)}
              className={`text-xs px-4 py-1.5 rounded-lg outline-none border font-semibold ${
                isLight
                  ? 'bg-slate-100 border-slate-300 text-slate-800 focus:border-blue-500'
                  : 'bg-[#2A1F6A] border-white/20 text-white focus:border-accent'
              }`}
              defaultValue=""
            >
              <option value="" disabled>Pilih Preset...</option>
              <option value="TODAY">Hari Ini</option>
              <option value="YESTERDAY">Kemarin</option>
              <option value="LAST_7">7 Hari Terakhir</option>
              <option value="LAST_30">30 Hari Terakhir</option>
              <option value="THIS_MONTH">Bulan Ini</option>
              <option value="ALL">Semua Waktu</option>
            </select>
          </div>
          
          <div className="flex gap-8">
            <div className="flex-1">
              <h3 className={`text-center text-xs uppercase mb-4 font-bold tracking-widest ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>Tanggal Mulai</h3>
              {renderCalendar(leftMonth, setLeftMonth)}
            </div>
            <div className="flex-1">
              <h3 className={`text-center text-xs uppercase mb-4 font-bold tracking-widest ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>Tanggal Akhir</h3>
              {renderCalendar(rightMonth, setRightMonth)}
            </div>
          </div>
          
          <div className={`flex justify-between items-center mt-6 pt-4 border-t ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
            <div className="flex flex-col gap-1">
              <div className={`text-xs font-bold ${isLight ? 'text-orange-700' : 'text-accent'}`}>
                {tempStart ? (tempEnd ? `${formatDate(toLocalISOString(tempStart))} - ${formatDate(toLocalISOString(tempEnd))}` : `Mulai ${formatDate(toLocalISOString(tempStart))}`) : 'Pilih Rentang...'}
              </div>
              <div className="flex gap-2">
                  <button 
                    onClick={() => { setTempStart(null); setTempEnd(null); }}
                    className={`text-xs px-2 py-1 rounded ${isLight ? 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200' : 'text-gray-300 hover:text-white bg-white/5'}`}
                  >
                    Reset
                  </button>
              </div>
            </div>
            <button
              onClick={handleApply}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-8 rounded-full transition-all shadow-lg"
            >
              Terapkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
