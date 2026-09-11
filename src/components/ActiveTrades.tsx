import React, { useEffect, useState } from 'react';
import { Trade } from '../types';
import { TrendingUp, TrendingDown, Gem, Sparkles } from 'lucide-react';
import { ASSET_DETAILS } from './AssetLogo';
import { cn } from '../lib/utils';

interface ActiveTradesProps {
  trades: Trade[];
  currentPrice?: number;
}

export const ActiveTrades: React.FC<ActiveTradesProps> = ({ trades, currentPrice }) => {
  const activeTrades = trades.filter(t => t.status === 'ACTIVE');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(interval);
  }, []);

  if (activeTrades.length === 0) return null;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[50] flex flex-col space-y-2 max-w-sm sm:max-w-md w-[92%] sm:w-full pointer-events-none">
      {activeTrades.map(trade => {
        const remaining = Math.max(0, trade.expiryTime - now);
        const secondsLeft = Math.ceil(remaining / 1000);
        const createdAtMs = typeof trade.createdAt === 'number' 
          ? trade.createdAt 
          : (typeof (trade.createdAt as any)?.toMillis === 'function' ? (trade.createdAt as any).toMillis() : Date.now());
        
        const totalDurationMs = Math.max(1000, trade.expiryTime - createdAtMs);
        const progressPercent = Math.min(100, Math.max(0, (remaining / totalDurationMs) * 100));

        // Payout and Live Win/Loss estimation
        const payoutRate = ASSET_DETAILS[trade.asset]?.payout ?? 82;
        const potentialProfit = trade.amount * (payoutRate / 100);
        
        const livePrice = currentPrice || trade.entryPrice;
        let isWinning = false;
        if (trade.action === 'CALL') {
          isWinning = livePrice > trade.entryPrice;
        } else {
          isWinning = livePrice < trade.entryPrice;
        }

        return (
          <div 
            key={trade.id} 
            className="relative bg-[#0F1419]/95 backdrop-blur-md border border-gray-700/80 rounded-2xl p-2.5 sm:p-3 flex flex-col shadow-2xl pointer-events-auto overflow-hidden animate-in fade-in slide-in-from-top duration-300"
          >
            {/* Top Glowing Diamond Timer Bar */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className={cn(
                  "p-1.5 rounded-xl flex items-center justify-center shadow-md",
                  trade.action === 'CALL' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                )}>
                  {trade.action === 'CALL' ? (
                    <TrendingUp className="w-4 h-4 stroke-[2.5]" />
                  ) : (
                    <TrendingDown className="w-4 h-4 stroke-[2.5]" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-black text-white text-xs sm:text-sm tracking-wide">{trade.asset}</span>
                    <span className={cn(
                      "text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider",
                      trade.action === 'CALL' ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    )}>
                      {trade.action} (${trade.amount})
                    </span>
                  </div>
                </div>
              </div>

              {/* Animated Diamond Timer Indicator */}
              <div className="flex items-center space-x-1.5 bg-gray-800/90 border border-cyan-500/40 px-2.5 py-1 rounded-xl shadow-inner">
                <div className="relative flex items-center justify-center">
                  <Gem className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <Sparkles className="w-2.5 h-2.5 text-cyan-200 absolute -top-1 -right-1 animate-spin" />
                </div>
                <span className="font-mono font-black text-xs sm:text-sm text-cyan-300">
                  {secondsLeft}s
                </span>
              </div>
            </div>

            {/* Price & Expected Return Status */}
            <div className="grid grid-cols-2 gap-2 text-[11px] sm:text-xs bg-gray-900/60 p-2 rounded-xl border border-gray-800/60">
              <div>
                <span className="text-gray-400 block text-[9px] uppercase tracking-wider font-bold">Entry Price</span>
                <span className="font-mono font-bold text-gray-200">
                  {trade.asset === 'EUR/USD' ? trade.entryPrice.toFixed(5) : trade.entryPrice.toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-gray-400 block text-[9px] uppercase tracking-wider font-bold">Expected Return</span>
                <span className={cn(
                  "font-mono font-black text-xs sm:text-sm",
                  isWinning ? "text-emerald-400" : "text-rose-400"
                )}>
                  {isWinning ? `+$${(trade.amount + potentialProfit).toFixed(2)}` : '$0.00'}
                </span>
              </div>
            </div>

            {/* Countdown Progress Bar with Diamond Glow */}
            <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mt-2">
              <div 
                className={cn(
                  "h-full transition-all duration-200 rounded-full",
                  isWinning ? "bg-gradient-to-r from-cyan-400 via-emerald-400 to-green-500" : "bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-500"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
