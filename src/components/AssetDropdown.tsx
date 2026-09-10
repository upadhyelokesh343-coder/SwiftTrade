import React, { useState } from 'react';
import { Asset } from '../types';
import { AssetLogo, ASSET_DETAILS } from './AssetLogo';
import { Check, Search } from 'lucide-react';
import { cn } from '../lib/utils';

interface AssetDropdownProps {
  selectedAsset: Asset;
  onSelectAsset: (asset: Asset) => void;
  isOpen: boolean;
  onClose: () => void;
  align?: 'left' | 'right';
}

const CATEGORIES = ['All', 'Forex', 'Crypto', 'Commodity', 'Stock'] as const;
type CategoryTab = typeof CATEGORIES[number];

const ALL_ASSET_KEYS: Asset[] = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/INR',
  'Bitcoin', 'Ethereum', 'Solana',
  'Gold', 'Silver', 'Crude Oil',
  'Apple', 'Microsoft', 'Google', 'Amazon', 'Meta', 'Netflix', 'Nvidia', 'Tesla',
  'Coca-Cola', 'PepsiCo', 'Visa', 'Mastercard'
];

export const AssetDropdown: React.FC<AssetDropdownProps> = ({
  selectedAsset,
  onSelectAsset,
  isOpen,
  onClose,
  align = 'left'
}) => {
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('All');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredAssets = ALL_ASSET_KEYS.filter(asset => {
    const details = ASSET_DETAILS[asset];
    const matchesCategory = activeCategory === 'All' || details.category === activeCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery = !query || 
      asset.toLowerCase().includes(query) || 
      details.symbol.toLowerCase().includes(query) ||
      details.category.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" 
        onClick={onClose} 
      />

      {/* Dropdown Container */}
      <div 
        className={cn(
          "absolute top-full mt-2 w-80 md:w-96 bg-[#13181E] rounded-2xl shadow-2xl border border-gray-700/80 overflow-hidden z-50 flex flex-col max-h-[460px] animate-in fade-in zoom-in-95 duration-150",
          align === 'left' ? 'left-0' : 'right-0'
        )}
      >
        {/* Header & Search */}
        <div className="p-3 border-b border-gray-800 bg-[#0F1419]/90 space-y-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search asset, symbol, category..."
              className="w-full bg-gray-800/80 border border-gray-700/80 text-white text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-gray-500"
              autoFocus
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar pt-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold transition shrink-0",
                  activeCategory === cat
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Asset List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-800/60 p-1">
          {filteredAssets.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500 font-medium">
              No assets found matching "{searchQuery}"
            </div>
          ) : (
            filteredAssets.map(assetKey => {
              const details = ASSET_DETAILS[assetKey];
              const isSelected = assetKey === selectedAsset;

              return (
                <button
                  key={assetKey}
                  onClick={() => {
                    onSelectAsset(assetKey);
                    onClose();
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl transition text-left group hover:bg-gray-800/70",
                    isSelected ? "bg-blue-600/15 border-l-3 border-blue-500" : ""
                  )}
                >
                  <div className="flex items-center space-x-3.5">
                    <AssetLogo asset={assetKey} size={28} />
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors">
                          {assetKey}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold bg-gray-800 px-1.5 py-0.5 rounded">
                          {details.category}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 font-medium mt-0.5">
                        {details.symbol}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5">
                    <span className="text-xs font-black text-green-400 bg-green-500/10 px-2 py-1 rounded-lg border border-green-500/20 shadow-xs">
                      +{details.payout}%
                    </span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/40">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};
