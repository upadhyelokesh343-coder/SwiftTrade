import React from 'react';
import { CandlestickChart, History, User, ArrowUpCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export type NavTab = 'trade' | 'history' | 'profile' | 'withdraw' | 'deposit';

interface BottomNavProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  activeTradeCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  activeTradeCount = 0
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'trade', label: 'Trade', icon: CandlestickChart },
    { id: 'history', label: 'History', icon: History, badge: activeTradeCount > 0 ? activeTradeCount : undefined },
    { id: 'withdraw', label: 'Withdraw', icon: ArrowUpCircle },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-[#0F1419]/95 backdrop-blur-md border-t border-gray-800 flex items-center justify-around z-40 px-1 shadow-2xl">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-1 transition-all relative cursor-pointer",
              isActive 
                ? "text-blue-400 font-bold" 
                : "text-gray-400 hover:text-gray-200 font-medium"
            )}
          >
            <div className="relative">
              <Icon className={cn("w-5 h-5 mb-0.5 transition-transform", isActive && "scale-110")} />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-2.5 bg-blue-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center border border-[#0F1419]">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight leading-none">{item.label}</span>
            {isActive && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};
