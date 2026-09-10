import React, { useState } from 'react';
import { Asset, TradeAction } from '../types';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { ASSET_DETAILS } from './AssetLogo';
import { cn } from '../lib/utils';

interface TradingControlsProps {
  asset: Asset;
  setAsset?: (asset: Asset) => void;
  onTrade: (amount: number, expiry: number, action: TradeAction) => boolean;
}

const QUICK_AMOUNTS = [10, 50, 100, 500];
const EXPIRY_OPTIONS = [
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '3m', value: 180 },
];

export const TradingControls: React.FC<TradingControlsProps> = ({ asset, onTrade }) => {
  const [amount, setAmount] = useState<number>(50);
  const [expiry, setExpiry] = useState<number>(30); // 30 seconds default

  const currentDetails = ASSET_DETAILS[asset] || ASSET_DETAILS['EUR/USD'];
  const payoutRate = currentDetails.payout;

  const handleTrade = (action: TradeAction) => {
    onTrade(amount, expiry, action);
  };

  return (
    <aside className="w-full lg:w-80 xl:w-96 bg-[#0F1419] border-t lg:border-t-0 lg:border-l border-gray-800 p-2 sm:p-4 lg:p-6 pb-2 lg:pb-6 flex flex-col justify-between z-20 shadow-2xl shrink lg:shrink-0 overflow-y-auto">
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-3 lg:space-y-4 lg:gap-0 shrink-0">

        {/* Investment Amount */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Investment ($)</label>
            <span className="text-[10px] font-bold text-emerald-400">+{payoutRate}%</span>
          </div>
          <div className="relative flex items-center">
            <DollarSign className="absolute left-2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
              className="w-full bg-gray-800/80 border border-gray-700/80 text-white font-black text-xs sm:text-base rounded-xl pl-6 pr-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              min="1"
            />
          </div>
        </div>

        {/* Duration / Expiry Timer */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Duration</label>
          <div className="grid grid-cols-3 gap-1">
            {EXPIRY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setExpiry(opt.value)}
                className={cn(
                  "py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border text-center",
                  expiry === opt.value 
                    ? "bg-blue-600 text-white shadow-md border-blue-400/60" 
                    : "bg-gray-800/60 hover:bg-gray-700 text-gray-300 border-gray-700/60"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Amount Buttons */}
        <div className="col-span-2 lg:col-span-1">
          <div className="grid grid-cols-4 gap-1">
            {QUICK_AMOUNTS.map(amt => (
              <button
                key={amt}
                onClick={() => setAmount(prev => prev + amt)}
                className="bg-gray-800/80 hover:bg-gray-700 text-[9px] sm:text-[10px] py-1 rounded-lg transition-colors text-white font-bold cursor-pointer"
              >
                +${amt}
              </button>
            ))}
          </div>
        </div>

        {/* Potential Return Summary */}
        <div className="col-span-2 lg:col-span-1 p-2 bg-gray-800/40 rounded-xl border border-gray-700/40 flex items-center justify-between">
          <span className="text-xs text-gray-400 font-medium">Potential Return</span>
          <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono">
            ${(amount * (1 + payoutRate / 100)).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Action Buttons (CALL / PUT) */}
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-3 mt-2 lg:mt-auto lg:pt-4 shrink-0">
        <button
          onClick={() => handleTrade('CALL')}
          className="w-full bg-[#107C41] hover:bg-[#138a49] active:bg-[#0c6334] text-white py-2.5 sm:py-3.5 lg:py-4 px-2 sm:px-3 rounded-xl flex items-center justify-center space-x-1.5 sm:space-x-3 transition-all active:scale-[0.98] border border-emerald-500/50 cursor-pointer group shadow-lg shadow-emerald-950/20"
        >
          <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-lg bg-black/30 flex items-center justify-center shrink-0">
            <TrendingUp className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-emerald-200 stroke-[2.5]" />
          </div>
          <div className="text-left">
            <div className="text-xs sm:text-sm lg:text-base font-black text-white tracking-wider leading-none">CALL</div>
            <div className="text-[8px] sm:text-[10px] font-bold text-emerald-100/90 uppercase tracking-wider mt-0.5">Higher / Up</div>
          </div>
        </button>

        <button
          onClick={() => handleTrade('PUT')}
          className="w-full bg-[#C5221F] hover:bg-[#d62824] active:bg-[#a31a17] text-white py-2.5 sm:py-3.5 lg:py-4 px-2 sm:px-3 rounded-xl flex items-center justify-center space-x-1.5 sm:space-x-3 transition-all active:scale-[0.98] border border-rose-500/50 cursor-pointer group shadow-lg shadow-rose-950/20"
        >
          <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-lg bg-black/30 flex items-center justify-center shrink-0">
            <TrendingDown className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-rose-200 stroke-[2.5]" />
          </div>
          <div className="text-left">
            <div className="text-xs sm:text-sm lg:text-base font-black text-white tracking-wider leading-none">PUT</div>
            <div className="text-[8px] sm:text-[10px] font-bold text-rose-100/90 uppercase tracking-wider mt-0.5">Lower / Down</div>
          </div>
        </button>
      </div>
    </aside>
  );
};

