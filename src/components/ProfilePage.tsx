import React, { useState, useEffect } from 'react';
import { AccountType, Trade } from '../types';
import { User, RefreshCw, Volume2, VolumeX, ShieldCheck, ArrowLeft, Check, Wallet, Award, Activity, Settings, Bell, Sliders, LogOut, ShieldAlert, Smartphone, Gift, PlusCircle, ArrowUpRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { soundManager } from '../lib/sound';
import { auth } from '../lib/firebase';
import { AdminPanel } from './AdminPanel';
import { PWAInstallButton } from './PWAInstallButton';

interface ProfilePageProps {
  accountType: AccountType;
  setAccountType: (type: AccountType) => void;
  balance: number;
  demoBalance?: number;
  realBalance?: number;
  onOpenDeposit?: () => void;
  onResetDemoBalance: () => void;
  trades: Trade[];
  onBackToTrade: () => void;
  onLogout: () => void;
  onShowWelcomeGift?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  accountType,
  setAccountType,
  balance,
  demoBalance = 10000,
  realBalance = 0,
  onOpenDeposit,
  onResetDemoBalance,
  trades,
  onBackToTrade,
  onLogout,
  onShowWelcomeGift
}) => {
  const [soundEnabled, setSoundEnabled] = useState(() => soundManager.isSoundEnabled());
  const [resetSuccess, setResetSuccess] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const currentUser = auth.currentUser;
  const isAdmin = currentUser?.email === 'rajsjarma8@gmail.com';

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundManager.setSoundEnabled(next);
    if (next) {
      soundManager.playTick();
    }
  };

  const completedTrades = trades.filter(t => t.status !== 'ACTIVE');
  const wins = completedTrades.filter(t => t.status === 'WIN').length;
  const losses = completedTrades.filter(t => t.status === 'LOSS').length;
  const winRate = completedTrades.length > 0 ? Math.round((wins / completedTrades.length) * 100) : 0;

  const totalProfit = completedTrades.reduce((acc, t) => {
    if (t.status === 'WIN') return acc + (t.profit || 0);
    if (t.status === 'LOSS') return acc - t.amount;
    return acc;
  }, 0);

  const handleReset = () => {
    onResetDemoBalance();
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 2500);
  };

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
              <User className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
              Account & Settings
            </h1>
            <p className="text-xs text-gray-400">Manage your profile, trading mode, and platform preferences</p>
          </div>
        </div>

        <button
          onClick={onBackToTrade}
          className="bg-blue-600 hover:bg-blue-500 text-white px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
        >
          Start Trading
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-5xl w-full mx-auto space-y-6">
        {/* Profile Card Header */}
        <div className="bg-gradient-to-r from-gray-900 via-[#121820] to-gray-900 p-6 rounded-2xl border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center space-x-4">
            <div className="relative">
              {currentUser?.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt="Profile" 
                  className="w-16 h-16 rounded-2xl border-2 border-blue-500/30 object-cover shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-2xl shadow-lg border border-white/10 shrink-0">
                  {currentUser?.displayName ? currentUser.displayName.substring(0, 1).toUpperCase() : 'TR'}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-[#0B0E11] flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h2 className="font-extrabold text-white text-lg sm:text-xl truncate max-w-[200px]">
                  {currentUser?.displayName || 'Active Trader'}
                </h2>
                <span className="text-xs bg-blue-500/20 text-blue-400 px-2.5 py-0.5 rounded-full border border-blue-500/30 font-semibold flex items-center gap-1 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" /> Google Verified
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 truncate">{currentUser?.email || 'Authenticated Account'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-black/40 p-3 rounded-xl border border-gray-800/80 shrink-0">
            <Award className="w-8 h-8 text-amber-400" />
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Account Status</span>
              <span className="text-sm font-bold text-amber-400">Pro Level 1</span>
            </div>
          </div>
        </div>

        {/* Account Mode & Balance Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Account Switcher */}
          <div className="bg-[#0F1419] p-5 rounded-2xl border border-gray-800 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Wallet className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm uppercase font-bold text-gray-300 tracking-wider">Trading Account Type</h3>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Switch between virtual practice funds or live market execution mode.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-1.5 bg-gray-900 rounded-xl border border-gray-800">
              <button
                onClick={() => setAccountType('Demo Account')}
                className={cn(
                  "py-3 px-3 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center space-y-1 cursor-pointer",
                  accountType === 'Demo Account'
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-400 hover:text-white"
                )}
              >
                <div className="flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-300"></div>
                  <span>Demo Account</span>
                </div>
                <span className="text-[11px] font-mono opacity-90">
                  ${demoBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </button>

              <button
                onClick={() => setAccountType('Real Account')}
                className={cn(
                  "py-3 px-3 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center space-y-1 cursor-pointer",
                  accountType === 'Real Account'
                    ? "bg-green-600 text-white shadow-md"
                    : "text-gray-400 hover:text-white"
                )}
              >
                <div className="flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-300"></div>
                  <span>Real Account</span>
                </div>
                <span className="text-[11px] font-mono opacity-90 text-emerald-400 font-bold">
                  ${realBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </button>
            </div>
          </div>

          {/* Quick Demo Fund Refill & Real Account Overview */}
          <div className="bg-[#0F1419] p-5 rounded-2xl border border-gray-800 shadow-md flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Virtual Demo Balance</span>
                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md font-mono font-bold">Practice Only</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-blue-400 my-2">
                ${demoBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-gray-400">
                100% risk-free practice funds starting at $10,000. Reset anytime if your practice balance runs low. Demo funds cannot be withdrawn.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-800">
              <button
                onClick={handleReset}
                className={cn(
                  "w-full py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center space-x-2 shadow-lg active:scale-95 cursor-pointer",
                  resetSuccess 
                    ? "bg-green-600 text-white" 
                    : "bg-blue-600 hover:bg-blue-500 text-white"
                )}
              >
                {resetSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Demo Balance Refilled to $10,000!</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Refill Demo Balance ($10,000)</span>
                  </>
                )}
              </button>

              {onShowWelcomeGift && (
                <button
                  onClick={onShowWelcomeGift}
                  className="w-full py-2 bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-emerald-500/20 hover:from-amber-500/30 hover:to-emerald-500/30 text-amber-300 rounded-xl text-xs font-black transition flex items-center justify-center space-x-2 border border-amber-500/40 cursor-pointer shadow-sm active:scale-95"
                >
                  <Gift className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                  <span>Open Welcome Gift Box Animation 🎁</span>
                </button>
              )}
            </div>
          </div>

          {/* Live Real Funds Card */}
          <div className="bg-[#0F1419] p-5 rounded-2xl border border-gray-800 shadow-md flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Live Real Balance</span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-md font-mono font-bold",
                  realBalance > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-800 text-gray-400"
                )}>
                  {realBalance > 0 ? "Active Capital" : "Unfunded ($0.00)"}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 my-2">
                ${realBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-gray-400">
                Your live market funds for real profits and withdrawals. New accounts strictly start at $0.00 until funded via deposit.
              </p>
            </div>

            <div className="pt-2 border-t border-gray-800">
              {onOpenDeposit && (
                <button
                  onClick={onOpenDeposit}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center space-x-2 shadow-lg active:scale-95 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Deposit Funds to Real Account</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Lifetime Performance Statistics */}
        <div className="bg-[#0F1419] p-5 rounded-2xl border border-gray-800 shadow-md">
          <div className="flex items-center space-x-2 mb-4">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm uppercase font-bold text-gray-300 tracking-wider">Trading Statistics</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-800">
              <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Total Trades</span>
              <span className="text-lg sm:text-xl font-extrabold text-white">{completedTrades.length}</span>
            </div>

            <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-800">
              <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Win Rate</span>
              <span className="text-lg sm:text-xl font-extrabold text-blue-400">{winRate}%</span>
            </div>

            <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-800">
              <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Wins / Losses</span>
              <div className="text-lg sm:text-xl font-extrabold">
                <span className="text-green-400">{wins}</span>
                <span className="text-gray-600 mx-1">/</span>
                <span className="text-red-400">{losses}</span>
              </div>
            </div>

            <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-800">
              <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Net Realized PnL</span>
              <span className={cn("text-lg sm:text-xl font-extrabold", totalProfit >= 0 ? "text-green-400" : "text-red-400")}>
                {totalProfit >= 0 ? `+$${totalProfit.toFixed(2)}` : `-$${Math.abs(totalProfit).toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>

        {/* App Preferences */}
        <div className="bg-[#0F1419] p-5 rounded-2xl border border-gray-800 shadow-md space-y-4">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm uppercase font-bold text-gray-300 tracking-wider">Platform Preferences</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-900/80 rounded-xl border border-gray-800">
              <div className="flex items-center space-x-3">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <div>
                  <span className="text-xs sm:text-sm font-bold text-white block">Install Mobile Application (APK / App)</span>
                  <span className="text-[11px] text-gray-400">Install SwiftTrade directly on your Android / iOS home screen as a standalone App</span>
                </div>
              </div>
              <PWAInstallButton />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-900/80 rounded-xl border border-gray-800">
              <div className="flex items-center space-x-3">
                {soundEnabled ? <Volume2 className="w-5 h-5 text-blue-400" /> : <VolumeX className="w-5 h-5 text-gray-500" />}
                <div>
                  <span className="text-xs sm:text-sm font-bold text-white block">Trading Audio Effects</span>
                  <span className="text-[11px] text-gray-400">Play subtle sound alerts on trade execution and completion</span>
                </div>
              </div>
              <button
                onClick={handleToggleSound}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0",
                  soundEnabled ? "bg-blue-600" : "bg-gray-700"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full bg-white absolute top-1 transition-transform",
                  soundEnabled ? "translate-x-7" : "translate-x-1"
                )} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-900/80 rounded-xl border border-gray-800">
              <div className="flex items-center space-x-3">
                <Bell className="w-5 h-5 text-purple-400" />
                <div>
                  <span className="text-xs sm:text-sm font-bold text-white block">Market Alert Notifications</span>
                  <span className="text-[11px] text-gray-400">Receive instant updates on asset volatility & payouts</span>
                </div>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0",
                  notifications ? "bg-purple-600" : "bg-gray-700"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full bg-white absolute top-1 transition-transform",
                  notifications ? "translate-x-7" : "translate-x-1"
                )} />
              </button>
            </div>
          </div>
        </div>

        {/* Admin Section (Only for rajsjarma8@gmail.com) */}
        {isAdmin && (
          <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 p-5 rounded-2xl border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-purple-400 animate-pulse" />
                <h3 className="text-sm uppercase font-black text-white tracking-widest">Admin Control Center</h3>
              </div>
              <span className="text-[10px] bg-purple-500 text-white px-2 py-0.5 rounded font-black uppercase">Root Access</span>
            </div>
            
            <p className="text-xs text-gray-400">
              Access the secure galaxy-themed administrative dashboard to manage global platform users, adjust live balances, and monitor system-wide trade logs.
            </p>

            <button
              onClick={() => setIsAdminOpen(true)}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] flex items-center justify-center space-x-2 active:scale-95 cursor-pointer uppercase tracking-widest"
            >
              <Settings className="w-4 h-4" />
              <span>Launch Admin Dashboard</span>
            </button>
          </div>
        )}

        {/* Sign Out Section */}
        <div className="pt-2">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 p-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl border border-red-500/20 transition-all font-bold text-sm cursor-pointer shadow-sm active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of Google Account</span>
          </button>
          <p className="text-center text-[10px] text-gray-500 mt-3 uppercase tracking-tighter font-bold">
            Secure Session Managed by Firebase Authentication
          </p>
        </div>

        {/* Admin Panel Overlay */}
        {isAdminOpen && <AdminPanel onClose={() => setIsAdminOpen(false)} />}
      </div>
    </div>
  );
};
