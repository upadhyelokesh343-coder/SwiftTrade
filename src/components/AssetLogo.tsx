import React from 'react';
import { Asset } from '../types';

interface AssetLogoProps {
  asset: Asset;
  className?: string;
  size?: number;
}

export const ASSET_DETAILS: Record<Asset, { name: Asset; symbol: string; category: string; payout: number; decimals: number }> = {
  // Forex
  'EUR/USD': { name: 'EUR/USD', symbol: 'EUR / USD', category: 'Forex', payout: 82, decimals: 5 },
  'GBP/USD': { name: 'GBP/USD', symbol: 'GBP / USD', category: 'Forex', payout: 85, decimals: 5 },
  'USD/JPY': { name: 'USD/JPY', symbol: 'USD / JPY', category: 'Forex', payout: 83, decimals: 3 },
  'USD/INR': { name: 'USD/INR', symbol: 'USD / INR', category: 'Forex', payout: 80, decimals: 3 },

  // Crypto
  'Bitcoin': { name: 'Bitcoin', symbol: 'BTC / USD', category: 'Crypto', payout: 86, decimals: 2 },
  'Ethereum': { name: 'Ethereum', symbol: 'ETH / USD', category: 'Crypto', payout: 84, decimals: 2 },
  'Solana': { name: 'Solana', symbol: 'SOL / USD', category: 'Crypto', payout: 85, decimals: 2 },

  // Commodities
  'Gold': { name: 'Gold', symbol: 'XAU / USD', category: 'Commodity', payout: 80, decimals: 2 },
  'Silver': { name: 'Silver', symbol: 'XAG / USD', category: 'Commodity', payout: 78, decimals: 3 },
  'Crude Oil': { name: 'Crude Oil', symbol: 'WTI / USD', category: 'Commodity', payout: 81, decimals: 2 },

  // Stocks & Tech Giants
  'Apple': { name: 'Apple', symbol: 'AAPL', category: 'Stock', payout: 82, decimals: 2 },
  'Microsoft': { name: 'Microsoft', symbol: 'MSFT', category: 'Stock', payout: 82, decimals: 2 },
  'Google': { name: 'Google', symbol: 'GOOGL', category: 'Stock', payout: 81, decimals: 2 },
  'Amazon': { name: 'Amazon', symbol: 'AMZN', category: 'Stock', payout: 84, decimals: 2 },
  'Meta': { name: 'Meta', symbol: 'META', category: 'Stock', payout: 83, decimals: 2 },
  'Netflix': { name: 'Netflix', symbol: 'NFLX', category: 'Stock', payout: 82, decimals: 2 },
  'Nvidia': { name: 'Nvidia', symbol: 'NVDA', category: 'Stock', payout: 87, decimals: 2 },
  'Tesla': { name: 'Tesla', symbol: 'TSLA', category: 'Stock', payout: 83, decimals: 2 },

  // Global Brands
  'Coca-Cola': { name: 'Coca-Cola', symbol: 'KO', category: 'Stock', payout: 80, decimals: 2 },
  'PepsiCo': { name: 'PepsiCo', symbol: 'PEP', category: 'Stock', payout: 80, decimals: 2 },
  'Visa': { name: 'Visa', symbol: 'V', category: 'Stock', payout: 81, decimals: 2 },
  'Mastercard': { name: 'Mastercard', symbol: 'MA', category: 'Stock', payout: 81, decimals: 2 },
};

// SVG Flag Helper Components
const EUFlag = ({ size }: { size: number }) => (
  <svg className="rounded-full shadow-sm shrink-0" width={size} height={size} viewBox="0 0 32 32">
    <rect width="32" height="32" fill="#003399" />
    <g fill="#FFCC00" transform="translate(16,16) scale(0.65)">
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x = 11 * Math.sin(rad);
        const y = -11 * Math.cos(rad);
        return (
          <polygon
            key={i}
            points="0,-2.5 0.7,-0.7 2.5,-0.7 1.1,0.4 1.6,2.2 0,1.1 -1.6,2.2 -1.1,0.4 -2.5,-0.7 -0.7,-0.7"
            transform={`translate(${x},${y})`}
          />
        );
      })}
    </g>
  </svg>
);

const USFlag = ({ size }: { size: number }) => (
  <svg className="rounded-full shadow-sm shrink-0" width={size} height={size} viewBox="0 0 32 32">
    <clipPath id="us-clip-gen">
      <circle cx="16" cy="16" r="16" />
    </clipPath>
    <g clipPath="url(#us-clip-gen)">
      <rect width="32" height="32" fill="#FFFFFF" />
      <rect y="0" width="32" height="4.5" fill="#B22234" />
      <rect y="9" width="32" height="4.5" fill="#B22234" />
      <rect y="18" width="32" height="4.5" fill="#B22234" />
      <rect y="27" width="32" height="5" fill="#B22234" />
      <rect x="0" y="0" width="15" height="18" fill="#3C3B6E" />
      <circle cx="4" cy="4" r="1" fill="#FFFFFF" />
      <circle cx="11" cy="4" r="1" fill="#FFFFFF" />
      <circle cx="7.5" cy="9" r="1" fill="#FFFFFF" />
      <circle cx="4" cy="14" r="1" fill="#FFFFFF" />
      <circle cx="11" cy="14" r="1" fill="#FFFFFF" />
    </g>
  </svg>
);

const UKFlag = ({ size }: { size: number }) => (
  <svg className="rounded-full shadow-sm shrink-0" width={size} height={size} viewBox="0 0 32 32">
    <clipPath id="uk-clip">
      <circle cx="16" cy="16" r="16" />
    </clipPath>
    <g clipPath="url(#uk-clip)">
      <rect width="32" height="32" fill="#012169" />
      <path d="M0,0 L32,32 M32,0 L0,32" stroke="#FFFFFF" strokeWidth="6" />
      <path d="M0,0 L32,32 M32,0 L0,32" stroke="#C8102E" strokeWidth="3" />
      <path d="M16,0 V32 M0,16 H32" stroke="#FFFFFF" strokeWidth="10" />
      <path d="M16,0 V32 M0,16 H32" stroke="#C8102E" strokeWidth="6" />
    </g>
  </svg>
);

const JPFlag = ({ size }: { size: number }) => (
  <svg className="rounded-full shadow-sm border border-gray-700 shrink-0" width={size} height={size} viewBox="0 0 32 32">
    <rect width="32" height="32" fill="#FFFFFF" />
    <circle cx="16" cy="16" r="9" fill="#BC002D" />
  </svg>
);

const INFlag = ({ size }: { size: number }) => (
  <svg className="rounded-full shadow-sm shrink-0" width={size} height={size} viewBox="0 0 32 32">
    <clipPath id="in-clip">
      <circle cx="16" cy="16" r="16" />
    </clipPath>
    <g clipPath="url(#in-clip)">
      <rect y="0" width="32" height="10.6" fill="#FF9933" />
      <rect y="10.6" width="32" height="10.8" fill="#FFFFFF" />
      <rect y="21.4" width="32" height="10.6" fill="#138808" />
      <circle cx="16" cy="16" r="4" stroke="#000080" strokeWidth="1" fill="none" />
      <circle cx="16" cy="16" r="1" fill="#000080" />
    </g>
  </svg>
);

const CurrencyPairLogo = ({ Flag1, Flag2, size }: { Flag1: React.FC<{ size: number }>; Flag2: React.FC<{ size: number }>; size: number }) => (
  <div className="relative flex items-center justify-center shrink-0" style={{ width: size * 1.35, height: size }}>
    <Flag1 size={size * 0.72} />
    <div className="-ml-2.5 border border-[#0B0E11] rounded-full z-10">
      <Flag2 size={size * 0.72} />
    </div>
  </div>
);

export const AssetLogo: React.FC<AssetLogoProps> = ({ asset, className = '', size = 20 }) => {
  switch (asset) {
    case 'EUR/USD':
      return <CurrencyPairLogo Flag1={EUFlag} Flag2={USFlag} size={size} />;
    case 'GBP/USD':
      return <CurrencyPairLogo Flag1={UKFlag} Flag2={USFlag} size={size} />;
    case 'USD/JPY':
      return <CurrencyPairLogo Flag1={USFlag} Flag2={JPFlag} size={size} />;
    case 'USD/INR':
      return <CurrencyPairLogo Flag1={USFlag} Flag2={INFlag} size={size} />;

    case 'Bitcoin':
      return (
        <svg className={`shrink-0 ${className}`} width={size} height={size} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="16" fill="#F7931A" />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M23.189 14.02c.314-2.099-1.283-3.228-3.465-3.982l.708-2.84-1.728-.43-.69 2.764c-.454-.113-.922-.22-1.386-.326l.695-2.783-1.728-.431-.708 2.839c-.376-.086-.746-.17-1.104-.26l.002-.009-2.384-.596-.46 1.846s1.283.294 1.256.312c.701.175.828.638.807 1.006l-.808 3.243c.048.012.11.03.18.057l-.183-.046-1.132 4.542c-.086.212-.304.53-.796.408.017.025-1.256-.314-1.256-.314l-.859 1.98 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.431.708-2.84c.472.128.93.245 1.378.357l-.705 2.825 1.728.432.715-2.864c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.535 2.147-4.15 0.986-5.322.694l.95-3.805c1.172.293 4.92.872 4.372 3.111zm.535-5.569c-.487 1.953-3.495.961-4.47.718l.861-3.451c.975.243 4.108.697 3.609 2.733z"
            fill="white"
          />
        </svg>
      );

    case 'Ethereum':
      return (
        <svg className={`shrink-0 ${className}`} width={size} height={size} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="16" fill="#627EEA" />
          <g transform="translate(6, 4) scale(0.625)">
            <path d="M16.498 0v11.854l9.997 4.473z" fill="#FFF" fillOpacity="0.6" />
            <path d="M16.498 0L6.5 16.327l9.998-4.473z" fill="#FFF" />
            <path d="M16.498 21.968v9.996l10.003-13.992z" fill="#FFF" fillOpacity="0.6" />
            <path d="M16.498 31.964v-9.996L6.5 17.972z" fill="#FFF" />
            <path d="M16.498 20.573l9.997-5.882-9.997-4.471z" fill="#FFF" fillOpacity="0.2" />
            <path d="M6.5 14.691l9.998 5.882v-10.353z" fill="#FFF" fillOpacity="0.6" />
          </g>
        </svg>
      );

    case 'Solana':
      return (
        <svg className={`shrink-0 ${className}`} width={size} height={size} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="16" fill="#14141E" />
          <defs>
            <linearGradient id="sol-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9945FF" />
              <stop offset="100%" stopColor="#14F195" />
            </linearGradient>
          </defs>
          <g transform="translate(7, 9) scale(0.75)" fill="url(#sol-grad)">
            <path d="M4 3.5h18.5l-3.5 3.5H0.5L4 3.5z" />
            <path d="M0.5 10.5h18.5l3.5 3.5H4L0.5 10.5z" />
            <path d="M4 17.5h18.5l-3.5 3.5H0.5L4 17.5z" />
          </g>
        </svg>
      );

    case 'Gold':
      return (
        <svg className={`shrink-0 ${className}`} width={size} height={size} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="16" fill="url(#gold-bg)" />
          <circle cx="16" cy="16" r="11" stroke="#FFD700" strokeWidth="1.2" fill="none" strokeDasharray="2 1" />
          <path
            d="M11 12.5L16 9.5L21 12.5V19.5L16 22.5L11 19.5V12.5Z"
            fill="url(#gold-inner)"
            stroke="#B38700"
            strokeWidth="1"
          />
          <path d="M16 9.5V22.5M11 12.5L21 19.5M21 12.5L11 19.5" stroke="#FFE780" strokeWidth="0.75" opacity="0.6" />
          <defs>
            <radialGradient id="gold-bg" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(10 8) scale(24)">
              <stop stopColor="#FFE57F" />
              <stop offset="0.5" stopColor="#FFC107" />
              <stop offset="1" stopColor="#B27B00" />
            </radialGradient>
            <linearGradient id="gold-inner" x1="11" y1="9.5" x2="21" y2="22.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFF2B2" />
              <stop offset="0.5" stopColor="#FFD54F" />
              <stop offset="1" stopColor="#C68A00" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'Silver':
      return (
        <svg className={`shrink-0 ${className}`} width={size} height={size} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="16" fill="url(#silver-bg)" />
          <circle cx="16" cy="16" r="11" stroke="#E0E0E0" strokeWidth="1.2" fill="none" strokeDasharray="2 1" />
          <path
            d="M11 12.5L16 9.5L21 12.5V19.5L16 22.5L11 19.5V12.5Z"
            fill="url(#silver-inner)"
            stroke="#9E9E9E"
            strokeWidth="1"
          />
          <path d="M16 9.5V22.5M11 12.5L21 19.5M21 12.5L11 19.5" stroke="#FFFFFF" strokeWidth="0.75" opacity="0.8" />
          <defs>
            <radialGradient id="silver-bg" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(10 8) scale(24)">
              <stop stopColor="#FFFFFF" />
              <stop offset="0.5" stopColor="#BDBDBD" />
              <stop offset="1" stopColor="#616161" />
            </radialGradient>
            <linearGradient id="silver-inner" x1="11" y1="9.5" x2="21" y2="22.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FAFAFA" />
              <stop offset="0.5" stopColor="#E0E0E0" />
              <stop offset="1" stopColor="#757575" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'Crude Oil':
      return (
        <svg className={`shrink-0 ${className}`} width={size} height={size} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="16" fill="#1C2127" stroke="#333D48" strokeWidth="1" />
          <path
            d="M16 6C16 6 8.5 16 8.5 20.5C8.5 24.642 11.858 28 16 28C20.142 28 23.5 24.642 23.5 20.5C23.5 16 16 6 16 6Z"
            fill="url(#oil-grad)"
          />
          <path
            d="M13.5 17C13.5 17 11 20 11 22C11 23.5 12 25 14 25"
            stroke="#4FA8FF"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.6"
          />
          <defs>
            <linearGradient id="oil-grad" x1="16" y1="6" x2="16" y2="28" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2C3E50" />
              <stop offset="0.5" stopColor="#0F171E" />
              <stop offset="1" stopColor="#050B10" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'Tesla':
      return (
        <svg className={`shrink-0 ${className}`} width={size} height={size} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="16" fill="#CC0000" />
          <path
            d="M16 11.2C13.2 11.2 10 11.9 8 13.2L8.8 14.8C10.5 13.8 13.2 13 16 13C18.8 13 21.5 13.8 23.2 14.8L24 13.2C22 11.9 18.8 11.2 16 11.2ZM16 8C11.5 8 7 9.2 5 11L5.8 12.8C7.5 11.3 11.5 10.2 16 10.2C20.5 10.2 24.5 11.3 26.2 12.8L27 11C25 9.2 20.5 8 16 8ZM14.8 13.5V24H17.2V13.5C16.8 13.5 16.4 13.5 16 13.5C15.6 13.5 15.2 13.5 14.8 13.5Z"
            fill="white"
          />
        </svg>
      );

    case 'Apple':
      return (
        <svg className={`shrink-0 ${className}`} width={size} height={size} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="16" fill="#000000" stroke="#333333" strokeWidth="1" />
          <path
            d="M20.2 16.3C20.2 13.8 22.2 12.5 22.3 12.4C21.1 10.7 19.3 10.5 18.7 10.4C17.2 10.2 15.7 11.2 14.9 11.2C14.1 11.2 12.9 10.3 11.6 10.4C9.9 10.4 8.4 11.3 7.6 12.8C5.9 15.7 7.2 20.1 8.8 22.5C9.6 23.7 10.6 25 11.9 24.9C13.2 24.8 13.7 24.1 15.2 24.1C16.7 24.1 17.1 24.9 18.4 24.9C19.7 24.9 20.6 23.7 21.4 22.5C22.3 21.2 22.7 20 22.7 19.9C22.6 19.8 20.2 18.9 20.2 16.3ZM17.8 8.8C18.5 7.9 18.9 6.7 18.7 5.5C17.7 5.5 16.4 6.2 15.7 7C15.1 7.7 14.6 9 14.8 10.1C16 10.2 17.1 9.5 17.8 8.8Z"
            fill="white"
          />
        </svg>
      );

    case 'Google':
      return (
        <svg className={`shrink-0 ${className}`} width={size} height={size} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="16" fill="#FFFFFF" />
          <path
            d="M24.6 16.3C24.6 15.7 24.5 15.1 24.4 14.6H16V17.9H20.8C20.6 19 20 19.9 19 20.6V22.8H21.9C23.6 21.2 24.6 18.9 24.6 16.3Z"
            fill="#4285F4"
          />
          <path
            d="M16 25C18.4 25 20.5 24.2 21.9 22.8L19 20.6C18.2 21.1 17.2 21.5 16 21.5C13.7 21.5 11.7 19.9 11 17.8H8V20.1C9.5 23 12.5 25 16 25Z"
            fill="#34A853"
          />
          <path
            d="M11 17.8C10.8 17.2 10.7 16.6 10.7 16C10.7 15.4 10.8 14.8 11 14.2V11.9H8C7.4 13.1 7 14.5 7 16C7 17.5 7.4 18.9 8 20.1L11 17.8Z"
            fill="#FBBC05"
          />
          <path
            d="M16 10.5C17.3 10.5 18.5 11 19.4 11.8L22 9.2C20.4 7.7 18.4 7 16 7C12.5 7 9.5 9 8 11.9L11 14.2C11.7 12.1 13.7 10.5 16 10.5Z"
            fill="#EA4335"
          />
        </svg>
      );

    case 'Microsoft':
      return (
        <svg className={`shrink-0 ${className}`} width={size} height={size} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="16" fill="#1E1E1E" />
          <g transform="translate(8, 8) scale(0.8)">
            <rect x="1" y="1" width="8.5" height="8.5" fill="#F25022" />
            <rect x="10.5" y="1" width="8.5" height="8.5" fill="#7FBA00" />
            <rect x="1" y="10.5" width="8.5" height="8.5" fill="#00A4EF" />
            <rect x="10.5" y="10.5" width="8.5" height="8.5" fill="#FFB900" />
          </g>
        </svg>
      );

    case 'Amazon':
      return (
        <svg className={`shrink-0 ${className}`} width={size} height={size} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="16" fill="#111827" />
          <text x="11" y="19" fill="#FFFFFF" fontFamily="sans-serif" fontWeight="bold" fontSize="13">a</text>
          <path
            d="M9 22C12 24.5 18 24.5 22 21M22 21L20.5 19.5M22 21L23 23"
            stroke="#FF9900"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'Meta':
      return (
        <svg className={`shrink-0 ${className}`} width={size} height={size} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="16" fill="#0668E1" />
          <path
            d="M9 18C9 15.5 10.5 13.5 12.5 13.5C14.2 13.5 15.2 15 16 16.5C16.8 15 17.8 13.5 19.5 13.5C21.5 13.5 23 15.5 23 18C23 20.5 21.5 22.5 19.5 22.5C17.8 22.5 16.8 21 16 19.5C15.2 21 14.2 22.5 12.5 22.5C10.5 22.5 9 20.5 9 18Z"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      );

    case 'Netflix':
      return (
        <svg className={`shrink-0 ${className}`} width={size} height={size} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="16" fill="#000000" stroke="#222" strokeWidth="1" />
          <g transform="translate(9, 7) scale(0.9)">
            <rect x="1" y="1" width="3.5" height="16" fill="#B81D24" />
            <rect x="11.5" y="1" width="3.5" height="16" fill="#B81D24" />
            <path d="M1 1L11.5 17H15L4.5 1H1Z" fill="#E50914" />
          </g>
        </svg>
      );

    case 'Nvidia':
      return (
        <svg className={`shrink-0 ${className}`} width={size} height={size} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="16" fill="#1A1A1A" />
          <path
            d="M10 20C10 15 13.5 11 18.5 11C21 11 23 12 24 13.5M12 20C12 16.5 14.5 13.5 18 13.5C20 13.5 21.5 14.5 22 15.5M14 20C14 18 15.5 16 17.5 16C18.5 16 19.5 16.5 20 17"
            stroke="#76B900"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="18" cy="18" r="1" fill="#76B900" />
        </svg>
      );

    case 'Coca-Cola':
      return (
        <svg className={`shrink-0 ${className}`} width={size} height={size} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="16" fill="#F40009" />
          <text x="7" y="18" fill="#FFFFFF" fontFamily="serif" fontWeight="900" fontStyle="italic" fontSize="11">Coke</text>
          <path d="M6 22C12 20 18 24 26 21" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );

    case 'PepsiCo':
      return (
        <svg className={`shrink-0 ${className}`} width={size} height={size} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="16" fill="#004B93" />
          <clipPath id="pepsi-clip">
            <circle cx="16" cy="16" r="12" />
          </clipPath>
          <g clipPath="url(#pepsi-clip)">
            <path d="M4 10C10 8 20 14 28 11V4H4V10Z" fill="#E32934" />
            <path d="M4 14C10 12 20 18 28 15V28H4V14Z" fill="#00256C" />
            <path d="M4 10C10 8 20 14 28 11C20 18 10 12 4 14V10Z" fill="#FFFFFF" />
          </g>
        </svg>
      );

    case 'Visa':
      return (
        <svg className={`shrink-0 ${className}`} width={size} height={size} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="16" fill="#1434CB" />
          <text x="6" y="20" fill="#FFFFFF" fontFamily="sans-serif" fontWeight="900" fontStyle="italic" fontSize="11" letterSpacing="0.5">
            VISA
          </text>
          <path d="M6 13L8 10H10" stroke="#FAA61A" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'Mastercard':
      return (
        <svg className={`shrink-0 ${className}`} width={size} height={size} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="16" fill="#111111" stroke="#333" strokeWidth="1" />
          <circle cx="12" cy="16" r="7" fill="#EB001B" />
          <circle cx="20" cy="16" r="7" fill="#FF5F00" fillOpacity="0.9" />
        </svg>
      );

    default:
      return null;
  }
};
