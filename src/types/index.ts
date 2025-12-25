export type TradeSide = 'LONG' | 'SHORT';
export type Execution = 'PASS' | 'FAIL';
export type Mood = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export interface Trade {
  id: string;
  symbol: string;
  side: TradeSide;
  tradeTime: string;
  setup?: string | null;
  risk: number;
  result?: number | null;
  execution: Execution;
  notes?: string | null;
  strategyId?: string | null;
  strategy?: Strategy | null;
  screenshots?: Screenshot[];
  tags?: TagOnTrade[];
  createdAt: string;
  updatedAt: string;
}

export interface Strategy {
  id: string;
  name: string;
  description?: string | null;
  setups?: string[] | null;
  trades?: Trade[];
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface TagOnTrade {
  tradeId: string;
  tagId: string;
  tag?: Tag;
}

export interface Screenshot {
  id: string;
  filename: string;
  path: string;
  tradeId: string;
  createdAt: string;
}

export interface DailyJournal {
  id: string;
  date: string;
  notes: string;
  mood?: Mood | null;
  lessons?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  id: string;
  defaultRisk: number;
  currency: string;
  theme: 'light' | 'dark';
}

export interface TradeFormData {
  symbol: string;
  side: TradeSide;
  tradeTime: string;
  setup?: string;
  risk: number;
  result?: number;
  execution: Execution;
  notes?: string;
  strategyId?: string;
}

export interface TradeFilters {
  dateFrom?: string;
  dateTo?: string;
  symbol?: string;
  side?: TradeSide;
  execution?: Execution;
  strategyId?: string;
  resultMin?: number;
  resultMax?: number;
}

export interface AnalyticsData {
  totalResult: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  averageRMultiple: number;
  largestWin: number;
  largestLoss: number;
  totalRisk: number;
  executionRate: number; // % of PASS executions
}

export interface DailyStats {
  date: string;
  pnl: number;
  trades: number;
  winRate: number;
}

export interface StrategyStats {
  strategyId: string;
  strategyName: string;
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  averageRMultiple: number;
}

export interface CSVColumnMapping {
  symbol: string;
  side: string;
  tradeTime: string;
  setup?: string;
  risk: string;
  result?: string;
  execution?: string;
}
