/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useTrading } from './hooks/useTrading';
import { Header } from './components/Header';
import { Chart } from './components/Chart';
import { TradingControls } from './components/TradingControls';
import { AssetLogo, ASSET_DETAILS } from './components/AssetLogo';
import { AssetDropdown } from './components/AssetDropdown';
import { BottomNav, NavTab } from './components/BottomNav';
import { HistoryPage } from './components/HistoryPage';
import { ProfilePage } from './components/ProfilePage';
import { WithdrawalPage } from './components/WithdrawalPage';
import { DepositPage } from './components/DepositPage';
import { TradeResultModal } from './components/TradeResultModal';
import { ActiveTrades } from './components/ActiveTrades';
import { InsufficientBalanceModal } from './components/InsufficientBalanceModal';
import { WelcomeGiftModal } from './components/WelcomeGiftModal';
import { LoginPage } from './components/LoginPage';
import { useConfig } from './hooks/useConfig';
import { ChevronDown, MoreVertical } from 'lucide-react';
import { ChartToolsDropdown } from './components/ChartToolsDropdown';
import { getSavedTimeZoneMode, saveTimeZoneMode, getLocalBrowserTimeZone } from './lib/timezone';
import { ChartUserLine, TradeAction } from './types';

export default function App() {
  const {
    accountType,
    setAccountType,
    balance,
    demoBalance,
    realBalance,
    activeAsset,
    setActiveAsset,
    historyRef,
    currentPrice,
    trades,
    placeTrade,
    lastCompletedTrade,
    clearLastTrade,
    resetDemoBalance,
    user,
    loginWithGoogle,
    loginWithEmail,
    logout
  } = useTrading();

  const config = useConfig();
  const [activeTab, setActiveTab] = useState<NavTab>('trade');
  const [isTopAssetDropdownOpen, setIsTopAssetDropdownOpen] = useState(false);
  const [isChartToolsOpen, setIsChartToolsOpen] = useState(false);
  const [activeDraggingLineId, setActiveDraggingLineId] = useState<string | null>(null);

  // Insufficient Balance State
  const [isInsufficientBalanceOpen, setIsInsufficientBalanceOpen] = useState(false);
  const [attemptedAmount, setAttemptedAmount] = useState(0);

  // Welcome Demo Gift Box Modal State
  const [showWelcomeGift, setShowWelcomeGift] = useState(false);

  useEffect(() => {
    if (user) {
      const storageKey = `swifttrade_welcome_shown_${user.uid}`;
      const hasBeenShown = localStorage.getItem(storageKey);
      if (!hasBeenShown) {
        setShowWelcomeGift(true);
      }
    }
  }, [user]);

  const handleCloseWelcomeGift = () => {
    if (user) {
      localStorage.setItem(`swifttrade_welcome_shown_${user.uid}`, 'true');
    }
    setShowWelcomeGift(false);
  };

  // Chart Timezone Mode (auto-detected local browser or UTC)
  const [chartTimeZone, setChartTimeZone] = useState<string>(() => getSavedTimeZoneMode());
  const handleTimeZoneChange = (newMode: string) => {
    setChartTimeZone(newMode);
    saveTimeZoneMode(newMode);
  };

  const handleTrade = async (amount: number, expiry: number, action: TradeAction) => {
    if (amount > balance) {
      setAttemptedAmount(amount);
      setIsInsufficientBalanceOpen(true);
      return false;
    }
    return placeTrade(amount, expiry, action);
  };

  // User-drawn trader analysis lines (Support, Resistance, Levels)
  const [userLines, setUserLines] = useState<ChartUserLine[]>(() => {
    try {
      const saved = localStorage.getItem('swifttrade_user_chart_lines');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('swifttrade_user_chart_lines', JSON.stringify(userLines));
    } catch (e) {
      // ignore
    }
  }, [userLines]);

  const handleAddUserLine = (newLine: Omit<ChartUserLine, 'id' | 'createdAt'>) => {
    const line: ChartUserLine = {
      ...newLine,
      id: 'line_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      createdAt: Date.now(),
    };
    setUserLines(prev => [...prev, line]);
  };

  const handleUpdateLinePrice = (id: string, newPrice: number) => {
    setUserLines(prev => prev.map(l => l.id === id ? { ...l, price: newPrice } : l));
  };

  const handleRemoveUserLine = (id: string) => {
    setUserLines(prev => prev.filter(l => l.id !== id));
  };

  const handleClearUserLines = () => {
    setUserLines(prev => prev.filter(l => l.asset !== activeAsset));
  };

  const activeAssetUserLines = userLines.filter(l => l.asset === activeAsset);

  if (!user) {
    return <LoginPage onLogin={loginWithGoogle} />;
  }

  const currentAssetInfo = ASSET_DETAILS[activeAsset] || ASSET_DETAILS['EUR/USD'];

  const activeTradesCount = trades.filter(t => t.status === 'ACTIVE').length;

  return (
    <div className="flex flex-col h-full h-[100dvh] bg-[#0B0E11] text-gray-200 font-sans overflow-hidden select-none">
      <Header 
        accountType={accountType} 
        setAccountType={setAccountType} 
        balance={balance}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenDeposit={() => setActiveTab('deposit')}
      />
      
      <main className="flex flex-col lg:flex-row flex-1 relative overflow-hidden z-10 w-full max-w-full min-h-0 pb-14 lg:pb-0">
        {activeTab === 'history' ? (
          <HistoryPage trades={trades} onBackToTrade={() => setActiveTab('trade')} />
        ) : activeTab === 'profile' ? (
          <ProfilePage 
            accountType={accountType}
            setAccountType={setAccountType}
            balance={balance}
            onResetDemoBalance={resetDemoBalance}
            trades={trades}
            onBackToTrade={() => setActiveTab('trade')}
            onLogout={logout}
            onShowWelcomeGift={() => setShowWelcomeGift(true)}
          />
        ) : activeTab === 'withdraw' ? (
          <WithdrawalPage 
            balance={balance} 
            onBackToTrade={() => setActiveTab('trade')} 
          />
        ) : activeTab === 'deposit' ? (
          <DepositPage 
            onBackToTrade={() => setActiveTab('trade')}
            onDepositSuccess={(amt) => setActiveTab('trade')}
          />
        ) : (
          <>
            {/* Main Chart Area */}
            <section className="flex-1 flex flex-col relative min-h-[40vh] lg:min-h-0 shrink z-0 w-full max-w-full overflow-hidden">
              <div className="flex items-center justify-between p-2 sm:p-3 px-2.5 sm:px-4 border-b border-gray-800/50 bg-[#0B0E11]/80 backdrop-blur-sm z-[30] relative w-full">
                <div className="flex items-center space-x-2 sm:space-x-3 max-w-full min-w-0 shrink">
                  {/* Interactive Top-Left Single Asset Selector Badge */}
                  <div className="relative">
                    <button 
                      onClick={() => setIsTopAssetDropdownOpen(!isTopAssetDropdownOpen)}
                      className="flex items-center space-x-1.5 sm:space-x-2 bg-gray-800/90 hover:bg-gray-700/90 px-2 sm:px-3 py-1.5 rounded-xl border border-gray-700/80 transition-colors shadow-sm cursor-pointer"
                      title="Select Asset / Company"
                    >
                      <AssetLogo asset={activeAsset} size={18} />
                      <div className="flex flex-col text-left">
                        <span className="font-bold text-white text-xs sm:text-sm leading-tight">{activeAsset}</span>
                        <span className="text-[9px] sm:text-[10px] text-gray-400 font-medium truncate max-w-[80px] sm:max-w-none">{currentAssetInfo.symbol}</span>
                      </div>
                      <span className="text-green-400 font-bold text-[10px] sm:text-xs bg-green-500/10 px-1 sm:px-2 py-0.5 rounded-md border border-green-500/20">
                        +{currentAssetInfo.payout}%
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 ml-0.5" />
                    </button>

                    <AssetDropdown
                      selectedAsset={activeAsset}
                      onSelectAsset={setActiveAsset}
                      isOpen={isTopAssetDropdownOpen}
                      onClose={() => setIsTopAssetDropdownOpen(false)}
                      align="left"
                    />
                  </div>

                  {/* Three-Dot Button for Trader Analysis Lines (Support / Resistance) */}
                  <div className="relative">
                    <button
                      onClick={() => setIsChartToolsOpen(!isChartToolsOpen)}
                      title="Chart Drawing Tools (Support / Resistance Lines)"
                      className={`flex items-center space-x-1 px-2 py-1.5 rounded-xl border transition-all cursor-pointer shadow-sm ${
                        isChartToolsOpen 
                          ? 'bg-blue-600/30 border-blue-500/80 text-white ring-2 ring-blue-500/30' 
                          : 'bg-gray-800/80 hover:bg-gray-700/80 border-gray-700/80 text-gray-300 hover:text-white'
                      }`}
                    >
                      <MoreVertical className="w-4 h-4 text-gray-300" />
                      {activeAssetUserLines.length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                      )}
                    </button>

                    <ChartToolsDropdown
                      asset={activeAsset}
                      currentPrice={currentPrice}
                      lines={activeAssetUserLines}
                      onAddLine={handleAddUserLine}
                      onUpdateLinePrice={handleUpdateLinePrice}
                      onRemoveLine={handleRemoveUserLine}
                      onClearLines={handleClearUserLines}
                      activeDraggingId={activeDraggingLineId}
                      isOpen={isChartToolsOpen}
                      onClose={() => setIsChartToolsOpen(false)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 relative bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-[#0B0E11] to-[#0B0E11]">
                <ActiveTrades trades={trades} currentPrice={currentPrice} />
                <Chart 
                  activeAsset={activeAsset} 
                  historyRef={historyRef} 
                  trades={trades.filter(t => t.asset === activeAsset)} 
                  userLines={activeAssetUserLines}
                  onUpdateLinePrice={handleUpdateLinePrice}
                  onRemoveLine={handleRemoveUserLine}
                  activeDraggingId={activeDraggingLineId}
                  onDraggingChange={setActiveDraggingLineId}
                  timeZoneMode={chartTimeZone}
                  onTimeZoneChange={handleTimeZoneChange}
                />
              </div>
            </section>

            {/* Sidebar Controls */}
            <TradingControls 
              asset={activeAsset} 
              onTrade={handleTrade} 
            />
          </>
        )}
      </main>

      <footer className="h-8 bg-[#080B0F] border-t border-gray-800 flex items-center justify-between px-4 text-[10px] text-gray-500 font-medium z-10 shrink-0 hidden lg:flex">
        <div className="flex items-center space-x-4">
          <span className="flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></span> Server: Stable</span>
          <span className="text-gray-400 font-mono">
            Zone: {chartTimeZone === 'utc' ? 'UTC (Universal)' : `${getLocalBrowserTimeZone()} (Local)`}
          </span>
        </div>
        <div className="flex items-center space-x-4 uppercase tracking-widest">
          <span>Transactions: 4,129,032</span>
          <span className="text-gray-400">© 2026 {config.platformName || 'SwiftTrade'}</span>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        activeTradeCount={activeTradesCount}
      />

      <InsufficientBalanceModal
        isOpen={isInsufficientBalanceOpen}
        onClose={() => setIsInsufficientBalanceOpen(false)}
        currentBalance={balance}
        requiredAmount={attemptedAmount}
        accountType={accountType}
        onOpenDeposit={() => setActiveTab('deposit')}
        onResetDemoBalance={resetDemoBalance}
        onSwitchAccount={setAccountType}
        otherAccountBalance={accountType === 'Demo Account' ? realBalance : demoBalance}
      />

      {/* Trade Result Popup (Pop Pop) */}
      <TradeResultModal 
        trade={lastCompletedTrade} 
        onClose={clearLastTrade} 
      />

      {/* Welcome Gift Box Unboxing Animation */}
      {showWelcomeGift && (
        <WelcomeGiftModal
          userName={user?.displayName || user?.email}
          demoBalance={demoBalance}
          onClose={handleCloseWelcomeGift}
        />
      )}
    </div>
  );
}


