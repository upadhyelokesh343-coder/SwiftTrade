export type Asset = 
  | 'EUR/USD' | 'GBP/USD' | 'USD/JPY' | 'USD/INR'
  | 'Bitcoin' | 'Ethereum' | 'Solana'
  | 'Gold' | 'Silver' | 'Crude Oil'
  | 'Apple' | 'Microsoft' | 'Google' | 'Amazon' | 'Meta' | 'Netflix' | 'Nvidia' | 'Tesla'
  | 'Coca-Cola' | 'PepsiCo' | 'Visa' | 'Mastercard';

export const ALL_ASSETS_LIST: Asset[] = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/INR',
  'Bitcoin', 'Ethereum', 'Solana',
  'Gold', 'Silver', 'Crude Oil',
  'Apple', 'Microsoft', 'Google', 'Amazon', 'Meta', 'Netflix', 'Nvidia', 'Tesla',
  'Coca-Cola', 'PepsiCo', 'Visa', 'Mastercard'
];

export type AccountType = 'Demo Account' | 'Real Account';
export type TradeAction = 'CALL' | 'PUT';
export type TradeStatus = 'ACTIVE' | 'WIN' | 'LOSS' | 'TIE';

export interface PricePoint {
  time: number;
  price: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface Trade {
  id: string;
  asset: Asset;
  action: TradeAction;
  entryPrice: number;
  amount: number;
  createdAt: number;
  expiryTime: number; // Expiry timestamp
  status: TradeStatus;
  resultPrice?: number;
  profit?: number;
}

export interface ChartUserLine {
  id: string;
  asset: Asset;
  price: number;
  label: string;
  color: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  createdAt: number;
}

export type ChartTimeZoneMode = 'local' | 'utc' | string;

export interface TimeZoneOption {
  id: string; // 'local', 'utc', or IANA zone e.g. 'America/New_York'
  label: string;
  city: string;
  region: string;
}

