// Market Data Types

export interface OHLCVCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ProcessedCandle extends OHLCVCandle {
  dailyReturn: number;
  intradayVolatility: number;
  trueRange: number;
  rollingVolatility: number;
  index: number;
}

export interface MarketStats {
  avgReturn: number;
  maxReturn: number;
  minReturn: number;
  stdReturn: number;
  avgVolatility: number;
  maxVolatility: number;
  totalReturn: number;
}

export interface MarketDataset {
  symbol: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  data: ProcessedCandle[];
  stats: MarketStats;
}

export interface RawMarketData {
  symbol: string;
  name: string;
  description: string;
  data: OHLCVCandle[];
}

export type MarketRegime = 'BULL' | 'BEAR' | 'CRASH' | 'CHOP' | 'RECOVERY';

export interface MarketIndicators {
  rsi: number;
  atr: number;
  volatility: number;
  trend: number;
  drawdown: number;
  regime: MarketRegime;
}

// Chart data format for react-financial-charts
export interface ChartCandle {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
