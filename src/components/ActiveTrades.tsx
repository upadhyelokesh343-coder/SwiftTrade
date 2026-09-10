import React, { useEffect, useState } from 'react';
import { Trade } from '../types';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatDistanceStrict } from 'date-fns';

interface ActiveTradesProps {
  trades: Trade[];
}

export const ActiveTrades: React.FC<ActiveTradesProps> = ({ trades }) => {
  const activeTrades = trades.filter(t => t.status === 'ACTIVE');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (activeTrades.length === 0) return null;

  return (
    <div className="absolute top-4 right-4 z-20 flex flex-col space-y-2 max-w-xs w-full pointer-events-none">
      {activeTrades.map(trade => {
        const remaining = Math.max(0, trade.expiryTime - now);
        const secondsLeft = Math.ceil(remaining / 1000);
        
        return (
          <div key={trade.id} className="bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-lg p-3 flex flex-col shadow-lg pointer-events-auto">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center space-x-2">
                {trade.action === 'CALL' ? (
                  <div className="bg-green-500/20 p-1 rounded">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </div>
                ) : (
                  <div className="bg-red-500/20 p-1 rounded">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  </div>
                )}
                <span className="font-bold text-white text-sm">{trade.asset}</span>
              </div>
              <div className="flex items-center space-x-1 text-yellow-500 font-mono text-sm">
                <Clock className="w-3 h-3" />
                <span>{secondsLeft}s</span>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs">
              <div className="flex flex-col">
                <span className="text-gray-400">Entry</span>
                <span className="text-white font-mono">{trade.asset === 'EUR/USD' ? trade.entryPrice.toFixed(5) : trade.entryPrice.toFixed(2)}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-gray-400">Amount</span>
                <span className="text-white font-mono">${trade.amount}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
