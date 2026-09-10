import React, { useState, useEffect, useRef } from 'react';
import { Asset, ChartUserLine } from '../types';
import { TrendingUp, TrendingDown, Minus, Trash2, X, Plus, Sliders, ChevronUp, ChevronDown } from 'lucide-react';

interface ChartToolsDropdownProps {
  asset: Asset;
  currentPrice: number;
  lines: ChartUserLine[];
  onAddLine: (line: Omit<ChartUserLine, 'id' | 'createdAt'>) => void;
  onUpdateLinePrice: (id: string, newPrice: number) => void;
  onRemoveLine: (id: string) => void;
  onClearLines: () => void;
  activeDraggingId?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ChartToolsDropdown: React.FC<ChartToolsDropdownProps> = ({
  asset,
  currentPrice,
  lines,
  onAddLine,
  onUpdateLinePrice,
  onRemoveLine,
  onClearLines,
  activeDraggingId,
  isOpen,
  onClose,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [customPrice, setCustomPrice] = useState<string>('');
  const [customLabel, setCustomLabel] = useState<string>('Custom Level');
  const [customColor, setCustomColor] = useState<string>('#3B82F6');

  // Step size for nudge buttons based on asset precision
  const isForex = asset.includes('/');
  const decimals = isForex ? 5 : 2;
  const step = isForex ? 0.0001 : 0.5;

  useEffect(() => {
    if (currentPrice > 0 && !customPrice) {
      setCustomPrice(currentPrice.toFixed(decimals));
    }
  }, [currentPrice, decimals]);

  // If a line is being dragged on the chart, dynamically update the custom price input box in real-time
  useEffect(() => {
    if (activeDraggingId) {
      const draggingLine = lines.find(l => l.id === activeDraggingId);
      if (draggingLine) {
        setCustomPrice(draggingLine.price.toFixed(decimals));
      }
    }
  }, [activeDraggingId, lines, decimals]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Preset quick-add lines
  const handleAddResistance = () => {
    const delta = isForex ? 0.0004 : (currentPrice * 0.001);
    const price = Number((currentPrice + delta).toFixed(decimals));
    onAddLine({
      asset,
      price,
      label: 'Resistance (ऊपर)',
      color: '#EF4444',
      lineStyle: 'dashed',
    });
  };

  const handleAddSupport = () => {
    const delta = isForex ? 0.0004 : (currentPrice * 0.001);
    const price = Number((currentPrice - delta).toFixed(decimals));
    onAddLine({
      asset,
      price,
      label: 'Support (नीचे)',
      color: '#10B981',
      lineStyle: 'dashed',
    });
  };

  const handleAddCurrentLevel = () => {
    onAddLine({
      asset,
      price: Number(currentPrice.toFixed(decimals)),
      label: 'Current Level',
      color: '#F59E0B',
      lineStyle: 'solid',
    });
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(customPrice);
    if (isNaN(priceNum) || priceNum <= 0) return;
    onAddLine({
      asset,
      price: priceNum,
      label: customLabel.trim() || 'Level',
      color: customColor,
      lineStyle: 'dashed',
    });
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 mt-2 w-80 sm:w-96 bg-[#11161D] border border-gray-700/80 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.6)] z-[100] overflow-hidden text-gray-200 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#161D26]">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Sliders className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
              Chart Lines & Tools
            </h3>
            <p className="text-[10px] text-gray-400 font-medium">
              Support & Resistance Lines ({asset})
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[460px] overflow-y-auto">
        {/* Quick Add Presets */}
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">
            Quick Add Lines (तुरंत लाइन जोड़ें)
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleAddResistance}
              className="bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-300 p-2.5 rounded-xl text-left transition-all active:scale-[0.98] cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-red-400 uppercase tracking-wide">Resistance</span>
                <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              </div>
              <div className="text-[10px] text-gray-400">Upper ceiling (ऊपर की लाइन)</div>
            </button>

            <button
              onClick={handleAddSupport}
              className="bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 p-2.5 rounded-xl text-left transition-all active:scale-[0.98] cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-emerald-400 uppercase tracking-wide">Support</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-[10px] text-gray-400">Lower bounce (नीचे की लाइन)</div>
            </button>
          </div>

          <button
            onClick={handleAddCurrentLevel}
            className="w-full mt-2 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700 text-amber-300 p-2 rounded-xl flex items-center justify-between text-xs font-bold transition-colors cursor-pointer"
          >
            <span className="flex items-center space-x-2">
              <Minus className="w-4 h-4 text-amber-400" />
              <span>Add Line at Current Price</span>
            </span>
            <span className="font-mono text-white text-[11px] bg-black/40 px-2 py-0.5 rounded border border-gray-700">
              {currentPrice.toFixed(decimals)}
            </span>
          </button>
        </div>

        {/* Custom Price Line */}
        <form onSubmit={handleAddCustom} className="p-3 bg-gray-900/60 rounded-xl border border-gray-800/80 space-y-2.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">
            Custom Price Line
          </span>
          <div className="flex space-x-2">
            <input
              type="number"
              step="any"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              placeholder="Enter price..."
              className="flex-1 bg-black/40 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
            />
            <select
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              className="bg-black/40 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="#3B82F6">Blue</option>
              <option value="#EF4444">Red</option>
              <option value="#10B981">Green</option>
              <option value="#F59E0B">Yellow</option>
              <option value="#EC4899">Pink</option>
              <option value="#FFFFFF">White</option>
            </select>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </form>

        {/* Active Lines List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Active Lines ({lines.length})
            </span>
            {lines.length > 0 && (
              <button
                onClick={onClearLines}
                className="text-[10px] text-red-400 hover:text-red-300 font-bold hover:underline cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>

          {lines.length === 0 ? (
            <div className="text-center py-4 px-2 border border-dashed border-gray-800 rounded-xl bg-gray-900/30">
              <p className="text-xs text-gray-500">No lines on this chart yet.</p>
              <p className="text-[10px] text-gray-600 mt-0.5">Click buttons above to add Resistance or Support lines.</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
              {lines.map((line) => {
                const isDraggingThis = activeDraggingId === line.id;
                return (
                  <div
                    key={line.id}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                      isDraggingThis
                        ? 'bg-blue-950/60 border-2 border-blue-500/80 shadow-md shadow-blue-500/20 scale-[1.01]'
                        : 'bg-gray-800/50 hover:bg-gray-800/80 border border-gray-700/60'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: line.color }}
                      />
                      <div className="truncate flex-1">
                        <div className="text-xs font-bold text-white truncate leading-tight flex items-center space-x-1">
                          <span>{line.label}</span>
                          {isDraggingThis && (
                            <span className="text-[9px] bg-blue-500 text-white font-black px-1 rounded animate-pulse">
                              DRAGGING
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1.5 mt-1">
                          <span className="text-[10px] text-gray-400 font-medium">Price:</span>
                          <input
                            type="number"
                            step="any"
                            value={line.price}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) onUpdateLinePrice(line.id, val);
                            }}
                            className={`w-24 bg-black/70 border rounded px-1.5 py-0.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-blue-500 ${
                              isDraggingThis ? 'border-blue-400 text-blue-200' : 'border-gray-700'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0 ml-2">
                      <button
                        onClick={() => onUpdateLinePrice(line.id, Number((line.price + step).toFixed(decimals)))}
                        title="Nudge Up"
                        className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white cursor-pointer"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onUpdateLinePrice(line.id, Number((line.price - step).toFixed(decimals)))}
                        title="Nudge Down"
                        className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white cursor-pointer"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onRemoveLine(line.id)}
                        title="Delete Line"
                        className="p-1 rounded hover:bg-red-900/50 text-gray-400 hover:text-red-400 transition-colors cursor-pointer ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drag-and-drop tip */}
        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 flex items-start space-x-2">
          <span className="text-base leading-none">💡</span>
          <span>
            <strong>Interactive Drag & Drop:</strong> You can click, hold, and drag any line or handle (↕) directly on the chart canvas using mouse or touch!
          </span>
        </div>
      </div>
    </div>
  );
};
