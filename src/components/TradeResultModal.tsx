import React from 'react';
import { Trade } from '../types';
import { CheckCircle2, XCircle, ArrowUpCircle, ArrowDownCircle, Coins, Calendar, Clock, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TradeResultModalProps {
  trade: Trade | null;
  onClose: () => void;
}

export const TradeResultModal: React.FC<TradeResultModalProps> = ({ trade, onClose }) => {
  if (!trade) return null;

  const isWin = trade.status === 'WIN';
  const profit = trade.profit || 0;
  const isUp = trade.action === 'CALL';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-sm bg-[#0F1419] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Header Status Banner */}
          <div className={`p-6 text-center ${isWin ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            <div className="flex justify-center mb-4">
              {isWin ? (
                <div className="relative">
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-green-500 blur-xl opacity-20" 
                  />
                  <CheckCircle2 className="w-16 h-16 text-green-500 relative" />
                </div>
              ) : (
                <XCircle className="w-16 h-16 text-red-500" />
              )}
            </div>
            <h2 className={`text-2xl font-black uppercase tracking-tight ${isWin ? 'text-green-500' : 'text-red-500'}`}>
              {isWin ? 'Trade Result: Win' : 'Trade Result: Loss'}
            </h2>
          </div>

          <div className="p-6 space-y-4">
            {/* Investment Amount */}
            <div className="bg-gray-800/40 rounded-2xl p-4 border border-gray-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-sm font-bold text-gray-300">Investment</span>
              </div>
              <span className="text-xl font-black text-white">${trade.amount}</span>
            </div>

            {/* Profit/Loss Amount */}
            <div className={`rounded-2xl p-4 border flex items-center justify-between ${isWin ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${isWin ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  <Coins className={`w-5 h-5 ${isWin ? 'text-green-500' : 'text-red-500'}`} />
                </div>
                <span className="text-sm font-bold text-gray-300">{isWin ? 'Profit' : 'Loss'}</span>
              </div>
              <span className={`text-xl font-black ${isWin ? 'text-green-500' : 'text-red-500'}`}>
                {isWin ? '+' : '-'}${Math.abs(profit).toFixed(2)}
              </span>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl transition-all active:scale-95"
            >
              Confirm
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
