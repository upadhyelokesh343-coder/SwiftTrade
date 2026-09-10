import React, { useState } from 'react';
import stLogoImg from '../assets/images/swift_trade_st_logo_1788858371191.jpg';

interface BrandLogoProps {
  name?: string;
  className?: string;
  textClassName?: string;
  iconSize?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Mixes two parts of the name dynamically:
 * First name part in crisp white, second name part in vivid cyan-blue gradient.
 */
export const renderBrandName = (name: string = 'SwiftTrade') => {
  const trimmed = name?.trim() || 'SwiftTrade';

  // Handles space separated (e.g. "Swift Trade", "Guru Trade")
  const parts = trimmed.split(' ');
  if (parts.length > 1) {
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');
    return (
      <span className="inline-flex items-center font-black tracking-tighter uppercase italic">
        <span className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{firstName}</span>
        <span className="ml-1 bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]">
          {lastName}
        </span>
      </span>
    );
  }

  // Handles camelCase split (e.g. "SwiftTrade", "GuruTrade", "OmniTrade")
  const camelMatch = trimmed.match(/^([A-Z][a-z0-9]+)([A-Z].*)$/);
  if (camelMatch) {
    return (
      <span className="inline-flex items-center font-black tracking-tighter uppercase italic">
        <span className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{camelMatch[1]}</span>
        <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]">
          {camelMatch[2]}
        </span>
      </span>
    );
  }

  // Fallback for single words > 4 chars (e.g. "Swift", "Trader")
  if (trimmed.length > 4) {
    const splitIndex = Math.ceil(trimmed.length / 2);
    const firstName = trimmed.slice(0, splitIndex);
    const lastName = trimmed.slice(splitIndex);
    return (
      <span className="inline-flex items-center font-black tracking-tighter uppercase italic">
        <span className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{firstName}</span>
        <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]">
          {lastName}
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center font-black tracking-tighter uppercase italic bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]">
      {trimmed}
    </span>
  );
};

export const BrandIconMark: React.FC<{ sizeClass?: string; initials?: string }> = ({ 
  sizeClass = 'w-8 h-8',
  initials = 'ST' 
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`relative ${sizeClass} shrink-0 group flex items-center justify-center`}>
      {/* Outer Glow Ring */}
      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 rounded-2xl blur-sm opacity-70 group-hover:opacity-100 transition duration-300 animate-pulse" />
      
      {/* Emblem Container */}
      <div className="relative w-full h-full rounded-xl bg-[#090D12] border border-cyan-400/50 p-0.5 shadow-xl shadow-cyan-500/20 overflow-hidden flex items-center justify-center">
        {!imgError ? (
          <img 
            src={stLogoImg} 
            alt="Brand Monogram Logo" 
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover rounded-lg transform group-hover:scale-105 transition duration-300"
          />
        ) : (
          /* High-Contrast Monogram Fallback */
          <div className="w-full h-full rounded-lg bg-gradient-to-br from-[#0F172A] to-[#020617] flex items-center justify-center border border-cyan-500/30">
            <span className="font-black italic tracking-tighter text-sm sm:text-base bg-gradient-to-r from-white via-cyan-300 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
              {initials}
            </span>
          </div>
        )}

        {/* Gloss Reflection Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none opacity-50" />
      </div>
    </div>
  );
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  name = 'SwiftTrade',
  className = '',
  textClassName = 'text-lg sm:text-xl font-black',
  iconSize,
  showIcon = true,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8 sm:w-9 sm:h-9',
    lg: 'w-11 h-11',
    xl: 'w-16 h-16'
  }[size];

  const customIconSize = iconSize || sizeClasses;

  return (
    <div className={`flex items-center space-x-2.5 ${className}`}>
      {showIcon && <BrandIconMark sizeClass={customIconSize} />}
      <span className={`${textClassName} select-none uppercase tracking-tight`}>
        {renderBrandName(name)}
      </span>
    </div>
  );
};

export const TradingHeroLogo: React.FC<{ name?: string }> = ({ name = 'SwiftTrade' }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="relative mb-5 group">
        <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 rounded-full blur-xl opacity-60 animate-pulse" />
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#090D12] border border-cyan-400/60 p-1 shadow-[0_0_35px_rgba(34,211,238,0.35)] flex items-center justify-center overflow-hidden">
          <BrandIconMark sizeClass="w-full h-full" />
        </div>
      </div>

      <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase italic drop-shadow-lg">
        {renderBrandName(name)}
      </h1>
    </div>
  );
};

