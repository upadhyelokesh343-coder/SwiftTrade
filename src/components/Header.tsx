import React from 'react';
import { AccountType } from '../types';
import { ChevronDown, CandlestickChart, History, User, ArrowUpCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { NavTab } from './BottomNav';
import { useConfig } from '../hooks/useConfig';
import { HelpSupport } from './HelpSupport';
import { BrandLogo } from './BrandLogo';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  accountType: AccountType;
  setAccountType: (type: AccountType) => void;
  balance: number;
  demoBalance?: number;
  realBalance?: number;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenDeposit?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  accountType, 
  setAccountType, 
  balance,
  demoBalance = 10000,
  realBalance = 0,
  activeTab,
  setActiveTab,
  onOpenDeposit
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const config = useConfig();

  const navItems: { id: NavTab; label: string; icon: React.ElementType }[] = [
    { id: 'trade', label: 'Trade', icon: CandlestickChart },
    { id: 'history', label: 'History', icon: History },
    { id: 'withdraw', label: 'Withdraw', icon: ArrowUpCircle },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <header className="flex items-center justify-between px-2 sm:px-6 h-14 sm:h-16 border-b border-gray-800 bg-[#0F1419] shadow-lg z-[100] shrink-0 relative w-full max-w-full">
      <div className="flex items-center space-x-2 sm:space-x-8 min-w-0 shrink">
        <button 
          onClick={() => setActiveTab('trade')}
          className="flex items-center text-left cursor-pointer transition-transform active:scale-95 shrink-0"
        >
          <BrandLogo name={config.platformName} textClassName="text-xs sm:text-xl font-black" size="sm" />
        </button>

        <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2 text-xs xl:text-sm font-medium">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                  isActive
                    ? "bg-blue-600/20 text-blue-400 font-bold border border-blue-500/30"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center space-x-1 sm:space-x-3 shrink-0">
        {/* PWA / APK Install Button */}
        <PWAInstallButton className="hidden md:flex" />

        {/* Support / Message Button - Always visible on both mobile and desktop */}
        <div className="flex shrink-0">
          <HelpSupport />
        </div>

        {/* Demo / Real Account Switcher Dropdown */}
        <div className="relative shrink-0 z-[150]">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="flex flex-col items-end hover:bg-gray-800/50 p-1 sm:p-2 -my-1 rounded-lg transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-1">
              <span className="text-[9px] sm:text-xs text-gray-400 uppercase tracking-wider font-semibold">
                {accountType === 'Demo Account' ? 'Demo' : 'Real'}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-500" />
            </div>
            <span className={cn(
              "text-xs sm:text-base font-bold font-mono tracking-tight",
              accountType === 'Demo Account' ? "text-green-400" : "text-blue-400"
            )}>
              ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </button>

          {isOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 sm:w-52 bg-[#12171D] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-gray-700/90 overflow-hidden z-[500] animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-gray-800 bg-black/40">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Select Account</span>
              </div>
              <button
                onClick={() => { setAccountType('Demo Account'); setIsOpen(false); }}
                className={cn(
                  "w-full text-left px-3 py-2.5 hover:bg-gray-800 transition flex items-center justify-between group cursor-pointer border-b border-gray-800/60",
                  accountType === 'Demo Account' ? "bg-blue-600/20" : ""
                )}
              >
                <div className="flex items-center space-x-2.5">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", accountType === 'Demo Account' ? "bg-blue-400" : "bg-gray-600 group-hover:bg-gray-400")} />
                  <div>
                    <span className={cn("text-xs sm:text-sm font-bold block leading-tight", accountType === 'Demo Account' ? "text-white" : "text-gray-300 group-hover:text-white")}>Demo Account</span>
                    <span className="text-[10px] font-mono text-gray-400">
                      ${demoBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                {accountType === 'Demo Account' && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] shrink-0" />}
              </button>
              <button
                onClick={() => { setAccountType('Real Account'); setIsOpen(false); }}
                className={cn(
                  "w-full text-left px-3 py-2.5 hover:bg-gray-800 transition flex items-center justify-between group cursor-pointer",
                  accountType === 'Real Account' ? "bg-green-600/20" : ""
                )}
              >
                <div className="flex items-center space-x-2.5">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", accountType === 'Real Account' ? "bg-green-400" : "bg-gray-600 group-hover:bg-gray-400")} />
                  <div>
                    <span className={cn("text-xs sm:text-sm font-bold block leading-tight", accountType === 'Real Account' ? "text-white" : "text-gray-300 group-hover:text-white")}>Real Account</span>
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                      ${realBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                {accountType === 'Real Account' && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] shrink-0" />}
              </button>
            </div>
          )}
        </div>

        <button 
          onClick={onOpenDeposit}
          className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs rounded-xl font-black tracking-wider uppercase transition-all shadow-md active:scale-95 cursor-pointer flex items-center space-x-1 border border-blue-400/40 shrink-0"
        >
          <span>Deposit</span>
        </button>
      </div>
    </header>
  );
};
