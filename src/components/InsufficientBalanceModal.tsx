import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X, Wallet, ArrowRight, RefreshCw, ArrowUpRight, DollarSign } from 'lucide-react';
import { AccountType } from '../types';
import { soundManager } from '../lib/sound';

interface InsufficientBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  requiredAmount: number;
  accountType: AccountType;
  onOpenDeposit: () => void;
  onResetDemoBalance?: () => void;
  onSwitchAccount?: (type: AccountType) => void;
  otherAccountBalance?: number;
}

export const InsufficientBalanceModal: React.FC<InsufficientBalanceModalProps> = ({
  isOpen,
  onClose,
  currentBalance,
  requiredAmount,
  accountType,
  onOpenDeposit,
  onResetDemoBalance,
  onSwitchAccount,
  otherAccountBalance = 0
}) => {
  useEffect(() => {
    if (isOpen) {
      soundManager.playWarning();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isDemo = accountType === 'Demo Account';
  const shortfall = Math.max(0, requiredAmount - currentBalance);
  const otherType: AccountType = isDemo ? 'Real Account' : 'Demo Account';
  const canSwitchToOther = otherAccountBalance >= requiredAmount;

  const handleDepositClick = () => {
    onClose();
    onOpenDeposit();
  };

  const handleResetDemoClick = () => {
    if (onResetDemoBalance) {
      onResetDemoBalance();
      onClose();
    }
  };

  const handleSwitchAccountClick = () => {
    if (onSwitchAccount) {
      onSwitchAccount(otherType);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div 
        id="insufficient-balance-backdrop"
        className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          id="insufficient-balance-modal"
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-[#0F1419] border border-amber-500/30 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.7),0_0_30px_rgba(245,158,11,0.15)] overflow-hidden flex flex-col"
        >
          {/* Subtle Top Glowing Accent Line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500" />

          {/* Close Button */}
          <button
            id="btn-close-insufficient-modal"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700 transition cursor-pointer z-10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6 sm:p-7 flex flex-col items-center text-center space-y-5">
            {/* Warning Icon with Pulse Animation */}
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)]">
                <AlertTriangle className="w-8 h-8 animate-pulse" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
                <DollarSign className="w-3.5 h-3.5 text-rose-400" />
              </div>
            </div>

            {/* Title & Core Message */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400/90 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                Trade Blocked • {accountType}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Insufficient Balance!
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 font-medium leading-relaxed max-w-sm">
                Please deposit funds to continue trading.
              </p>
            </div>

            {/* Financial Breakdown Card */}
            <div className="w-full bg-[#121820] border border-gray-800 rounded-2xl p-4 space-y-2.5 text-left">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-medium">Available Balance:</span>
                <span className="font-bold text-rose-400 font-mono">
                  ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-medium">Attempted Investment:</span>
                <span className="font-bold text-white font-mono">
                  ${requiredAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs">
                <span className="text-gray-400 font-medium">Required Shortfall:</span>
                <span className="font-black text-amber-400 font-mono">
                  +${shortfall.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="w-full space-y-2.5 pt-1">
              {/* Primary Direct Button: Open Deposit Modal */}
              <button
                id="btn-insufficient-open-deposit"
                onClick={handleDepositClick}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(37,99,235,0.35)] active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer border border-blue-400/40"
              >
                <Wallet className="w-4 h-4" />
                <span>Deposit Funds</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Instant Virtual Refill Button if in Demo Account */}
              {isDemo && onResetDemoBalance && (
                <button
                  id="btn-insufficient-refill-demo"
                  onClick={handleResetDemoClick}
                  className="w-full py-3 px-4 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.98]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refill Demo Balance ($10,000)</span>
                </button>
              )}

              {/* Quick switch to the other account if it has sufficient balance */}
              {canSwitchToOther && onSwitchAccount && (
                <button
                  id="btn-insufficient-switch-account"
                  onClick={handleSwitchAccountClick}
                  className="w-full py-2.5 px-4 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
                  <span>Switch to {otherType} (${otherAccountBalance.toFixed(2)})</span>
                </button>
              )}

              <button
                id="btn-insufficient-cancel"
                onClick={onClose}
                className="w-full py-2 text-xs text-gray-500 hover:text-gray-400 transition cursor-pointer font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
