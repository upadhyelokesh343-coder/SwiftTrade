import React, { useState } from 'react';
import { Trade } from '../types';
import { TrendingUp, TrendingDown, Clock, ArrowLeft, CheckCircle2, XCircle, BarChart3, Filter } from 'lucide-react';
import { AssetLogo, ASSET_DETAILS } from './AssetLogo';
import { cn } from '../lib/utils';

interface HistoryPageProps {
  trades: Trade[];
  onBackToTrade: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ trades, onBackToTrade }) => {
  const [filter, setFilter] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL');

  const completedTrades = trades.filter(t => t.status !== 'ACTIVE');
  
  const filteredTrades = completedTrades.filter(t => {
    if (filter === 'WIN') return t.status === 'WIN';
    if (filter === 'LOSS') return t.status === 'LOSS';
    return true;
  });

  const wins = completedTrades.filter(t => t.status === 'WIN').length;
  const losses = completedTrades.filter(t => t.status === 'LOSS').length;
  const winRate = completedTrades.length > 0 ? Math.round((wins / completedTrades.length) * 100) : 0;
  
  const totalProfit = completedTrades.reduce((acc, t) => {
    if (t.status === 'WIN') return acc + (t.profit || 0);
    if (t.status === 'LOSS') return acc - t.amount;
    return acc;
  }, 0);

  return (
    <div className="flex-1 flex flex-col bg-[#0B0E11] text-gray-200 overflow-hidden w-full h-full">
      {/* Top Banner */}
      <div className="p-4 sm:p-6 bg-[#0F1419] border-b border-gray-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToTrade}
            className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition flex items-center space-x-1.5 text-xs font-semibold cursor-pointer border border-gray-700/60"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Live Chart</span>
          </button>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
              Trading History
            </h1>
            <p className="text-xs text-gray-400">Complete log of all executed and closed positions</p>
          </div>
        </div>

        <button
          onClick={onBackToTrade}
          className="bg-blue-600 hover:bg-blue-500 text-white px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
        >
          New Trade
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-6xl w-full mx-auto space-y-6">
        {/* Performance Metrics Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#0F1419] p-4 rounded-2xl border border-gray-800/80 shadow-md">
            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider block mb-1">Total Closed Trades</span>
            <span className="text-xl sm:text-2xl font-black text-white">{completedTrades.length}</span>
          </div>

          <div className="bg-[#0F1419] p-4 rounded-2xl border border-gray-800/80 shadow-md">
            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider block mb-1">Win Rate</span>
            <span className="text-xl sm:text-2xl font-black text-blue-400">{winRate}%</span>
          </div>

          <div className="bg-[#0F1419] p-4 rounded-2xl border border-gray-800/80 shadow-md">
            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider block mb-1">Wins / Losses</span>
            <div className="text-xl sm:text-2xl font-black">
              <span className="text-green-400">{wins}</span>
              <span className="text-gray-600 mx-1.5">/</span>
              <span className="text-red-400">{losses}</span>
            </div>
          </div>

          <div className="bg-[#0F1419] p-4 rounded-2xl border border-gray-800/80 shadow-md">
            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider block mb-1">Net Realized Profit</span>
            <span className={cn("text-xl sm:text-2xl font-black", totalProfit >= 0 ? "text-green-400" : "text-red-400")}>
              {totalProfit >= 0 ? `+$${totalProfit.toFixed(2)}` : `-$${Math.abs(totalProfit).toFixed(2)}`}
            </span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex items-center justify-between bg-[#0F1419] p-3 rounded-2xl border border-gray-800 flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400 ml-1" />
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Filter:</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-gray-900 p-1 rounded-xl border border-gray-800">
            <button
              onClick={() => setFilter('ALL')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer",
                filter === 'ALL' ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-white"
              )}
            >
              All ({completedTrades.length})
            </button>
            <button
              onClick={() => setFilter('WIN')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer",
                filter === 'WIN' ? "bg-green-600 text-white shadow-sm" : "text-gray-400 hover:text-white"
              )}
            >
              Wins ({wins})
            </button>
            <button
              onClick={() => setFilter('LOSS')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer",
                filter === 'LOSS' ? "bg-red-600 text-white shadow-sm" : "text-gray-400 hover:text-white"
              )}
            >
              Losses ({losses})
            </button>
          </div>
        </div>

        {/* Closed Trades List */}
        <div className="space-y-3">
          {filteredTrades.length === 0 ? (
            <div className="bg-[#0F1419] border border-gray-800/80 rounded-2xl p-12 text-center text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-600 opacity-60" />
              <h3 className="text-base font-bold text-gray-300">No trades match this filter</h3>
              <p className="text-xs text-gray-500 mt-1">Execute positions on the live chart to see them recorded here.</p>
            </div>
          ) : (
            filteredTrades.map((trade) => {
              const isWin = trade.status === 'WIN';
              const isCall = trade.action === 'CALL';
              const assetInfo = ASSET_DETAILS[trade.asset];
              const formattedTime = new Date(trade.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const formattedDate = new Date(trade.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
              const durationSec = Math.round((trade.expiryTime - trade.createdAt) / 1000);

              return (
                <div
                  key={trade.id}
                  className={cn(
                    "bg-[#121820] border-2 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl transition-all",
                    isWin ? "border-emerald-500/50 bg-[#0F1E16]" : "border-rose-500/50 bg-[#1F1012]"
                  )}
                >
                  {/* Left: Asset info & direction badge */}
                  <div className="flex items-center space-x-3.5">
                    <AssetLogo asset={trade.asset} size={40} />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-white text-base sm:text-lg tracking-tight">{trade.asset}</span>
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow-sm",
                          isCall ? "bg-emerald-500 text-black" : "bg-rose-500 text-white"
                        )}>
                          {isCall ? <TrendingUp className="w-3.5 h-3.5 stroke-[3]" /> : <TrendingDown className="w-3.5 h-3.5 stroke-[3]" />}
                          {trade.action}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-300 font-semibold mt-1">
                        <span className="text-gray-200">{assetInfo?.symbol || 'GLOBAL'}</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-amber-300 font-bold">{durationSec}s Duration</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-300">{formattedDate}, {formattedTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Investment & Outcome status */}
                  <div className="flex items-center justify-between sm:justify-end sm:space-x-8 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-800/80">
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-gray-400 uppercase font-black tracking-wider block mb-0.5">Investment</span>
                      <span className="text-base sm:text-lg font-black font-mono text-white">${trade.amount.toFixed(2)}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-gray-400 uppercase font-black tracking-wider block mb-0.5">Net Result</span>
                      <div className={cn(
                        "text-base sm:text-lg font-black font-mono flex items-center justify-end space-x-1 px-3 py-1 rounded-xl border shadow-sm",
                        isWin 
                          ? "text-emerald-300 bg-emerald-500/20 border-emerald-500/40" 
                          : "text-rose-300 bg-rose-500/20 border-rose-500/40"
                      )}>
                        {isWin ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 stroke-[2.5]" />
                            <span>WIN +${(trade.profit || 0).toFixed(2)}</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-rose-400 stroke-[2.5]" />
                            <span>LOSS -${trade.amount.toFixed(2)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
