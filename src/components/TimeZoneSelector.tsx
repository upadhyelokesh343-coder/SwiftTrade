import React, { useState, useEffect, useRef } from 'react';
import { Globe, Clock, Check, ChevronDown } from 'lucide-react';
import { 
  POPULAR_TIMEZONE_OPTIONS, 
  getTimeZoneDisplayInfo, 
  getLocalBrowserTimeZone,
  getResolvedTimeZone,
  saveTimeZoneMode 
} from '../lib/timezone';

interface TimeZoneSelectorProps {
  timeZoneMode: string;
  onSelectTimeZone: (mode: string) => void;
  variant?: 'toolbar' | 'chart-overlay' | 'dropdown-item';
  className?: string;
}

export const TimeZoneSelector: React.FC<TimeZoneSelectorProps> = ({
  timeZoneMode,
  onSelectTimeZone,
  variant = 'chart-overlay',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const displayInfo = getTimeZoneDisplayInfo(timeZoneMode);
  const browserTz = getLocalBrowserTimeZone();

  // Keep live time clock in menu updated every second
  useEffect(() => {
    const updateClock = () => {
      try {
        const resolved = getResolvedTimeZone(timeZoneMode);
        const now = new Date();
        const str = new Intl.DateTimeFormat('en-US', {
          timeZone: resolved,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(now);
        setCurrentTimeStr(str);
      } catch (e) {
        setCurrentTimeStr('');
      }
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [timeZoneMode]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (mode: string) => {
    onSelectTimeZone(mode);
    saveTimeZoneMode(mode);
    setIsOpen(false);
  };

  const handleQuickToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Toggle between local and utc
    const nextMode = displayInfo.isUtc ? 'local' : 'utc';
    handleSelect(nextMode);
  };

  if (variant === 'toolbar') {
    return (
      <div className={`relative ${className}`} ref={containerRef}>
        <div className="flex items-center rounded-lg bg-gray-800/80 border border-gray-700/60 p-0.5 shadow-sm">
          {/* Quick toggle button */}
          <button
            type="button"
            onClick={handleQuickToggle}
            title={`Switch to ${displayInfo.isUtc ? 'Local Time' : 'UTC'}`}
            className="flex items-center space-x-1.5 px-2.5 py-1 text-[11px] font-semibold text-gray-200 hover:text-white transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="font-mono">{displayInfo.shortLabel}</span>
          </button>

          {/* Dropdown open trigger */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            title="Select Chart Time Zone"
            className="px-1.5 py-1 text-gray-400 hover:text-white border-l border-gray-700/60 transition-colors cursor-pointer"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {isOpen && renderDropdownMenu()}
      </div>
    );
  }

  // Default: chart-overlay (TradingView-style bottom-right or corner overlay)
  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={`Chart Timezone: ${displayInfo.displayName}. Click to change or switch UTC / Local Time`}
        className={`flex items-center space-x-1.5 px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-mono font-medium backdrop-blur-md transition-all cursor-pointer shadow-lg select-none border ${
          isOpen 
            ? 'bg-blue-600/30 text-white border-blue-500/80 ring-2 ring-blue-500/20' 
            : 'bg-[#0E1318]/90 hover:bg-[#161F2A] text-gray-300 hover:text-white border-gray-800 hover:border-gray-700'
        }`}
      >
        <Globe className="w-3 h-3 text-blue-400" />
        <span className="font-semibold">{displayInfo.shortLabel}</span>
        <span className="text-[9px] text-gray-400">{displayInfo.offsetStr}</span>
        <ChevronDown className="w-2.5 h-2.5 text-gray-400" />
      </button>

      {isOpen && renderDropdownMenu()}
    </div>
  );

  function renderDropdownMenu() {
    return (
      <div 
        className="absolute bottom-full right-0 mb-2 w-72 sm:w-80 rounded-2xl bg-[#111822]/98 border border-gray-700/80 shadow-2xl backdrop-blur-xl z-50 overflow-hidden select-none p-3 animate-in fade-in zoom-in-95 duration-150"
        style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)' }}
      >
        {/* Header with live clock */}
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-gray-800">
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-black text-white uppercase tracking-wider">Chart Time Zone</span>
          </div>
          {currentTimeStr && (
            <div className="flex items-center space-x-1 bg-black/60 px-2 py-0.5 rounded border border-gray-800 font-mono text-xs font-black text-blue-300">
              <Clock className="w-3 h-3 text-blue-400" />
              <span>{currentTimeStr}</span>
            </div>
          )}
        </div>

        {/* Quick 1-Click Toggle Buttons between Local and UTC */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/50 rounded-xl border border-gray-800 mb-3">
          <button
            type="button"
            onClick={() => handleSelect('local')}
            className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              displayInfo.isLocal
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <span>Local Browser</span>
            {displayInfo.isLocal && <Check className="w-3 h-3" />}
          </button>

          <button
            type="button"
            onClick={() => handleSelect('utc')}
            className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              displayInfo.isUtc
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <span>UTC (Universal)</span>
            {displayInfo.isUtc && <Check className="w-3 h-3" />}
          </button>
        </div>

        {/* Detected Info Pill */}
        <div className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-300 mb-3 flex items-center justify-between">
          <span className="truncate">Auto-Detected Browser Zone:</span>
          <span className="font-mono font-bold text-white shrink-0 ml-1">{browserTz}</span>
        </div>

        {/* Global Financial Sessions List */}
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1 mb-1.5">
          Major Market Sessions
        </div>

        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {POPULAR_TIMEZONE_OPTIONS.map((opt) => {
            const isSelected = timeZoneMode === opt.id || (opt.id === 'local' && displayInfo.isLocal);
            const optInfo = getTimeZoneDisplayInfo(opt.id);

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect(opt.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600/20 border border-blue-500/50 text-white'
                    : 'hover:bg-gray-800/70 border border-transparent text-gray-300 hover:text-white'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold flex items-center space-x-1.5">
                    <span className="truncate">{opt.label}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono">
                    {opt.region} • {optInfo.offsetStr}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 ml-2">
                  <span className="text-[10px] font-mono font-black text-gray-400 bg-black/40 px-1.5 py-0.5 rounded">
                    {optInfo.abbr}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer tip */}
        <div className="mt-2.5 pt-2 border-t border-gray-800/80 text-[10px] text-gray-400 text-center">
          Timeline tick marks & crosshairs sync instantly across all candles.
        </div>
      </div>
    );
  }
};
