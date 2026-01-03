export type TradeSide = 'LONG' | 'SHORT';
export type Execution = 'PASS' | 'FAIL';
export type Mood = 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'TRENDING' | 'CHOPPY' | 'RANGING';

// AI-ready types
export type PreTradeMood = 'CONFIDENT' | 'ANXIOUS' | 'FOMO' | 'REVENGE' | 'CALM' | 'NEUTRAL';
export type PostTradeMood = 'SATISFIED' | 'FRUSTRATED' | 'RELIEVED' | 'REGRETFUL' | 'NEUTRAL';
export type TradeMistake = 'FOMO' | 'CHASING' | 'EARLY_EXIT' | 'OVERSIZE' | 'REVENGE' | 'NO_PLAN' | 'IGNORED_STOP' | 'MOVED_STOP' | 'NO_STOP' | 'OVERTRADING';

export interface Account {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Trade {
  id: string;
  symbol: string;
  side: TradeSide;
  tradeTime: string;
  exitTime?: string | null;
  setup?: string | null;
  risk: number;
  result?: number | null;
  execution: Execution;
  isBreakEven: boolean;
  notes?: string | null;
  // AI-ready fields
  preTradeMood?: PreTradeMood | null;
  postTradeMood?: PostTradeMood | null;
  confidenceLevel?: number | null;
  mistake?: TradeMistake | null;
  sentimentScore?: number | null;      // AI-computed (-1 to 1)
  sequenceInSession?: number | null;   // Calculated programmatically
  holdDurationMins?: number | null;    // Calculated from exit - entry
  strategyId?: string | null;
  strategy?: Strategy | null;
  accountId?: string | null;
  account?: Account | null;
  screenshots?: Screenshot[];
  tags?: TagOnTrade[];
  ruleChecks?: TradeRuleCheck[];
  createdAt: string;
  updatedAt: string;
}

export interface Strategy {
  id: string;
  name: string;
  description?: string | null;
  setups?: string[] | null;
  trades?: Trade[];
  rules?: StrategyRule[];
  screenshots?: StrategyScreenshot[];
  createdAt: string;
  updatedAt: string;
}

export interface StrategyRule {
  id: string;
  strategyId: string;
  text: string;
  order: number;
  createdAt: string;
}

export interface StrategyScreenshot {
  id: string;
  strategyId: string;
  filename: string;
  path: string;
  publicId?: string | null;
  caption?: string | null;
  createdAt: string;
}

export interface TradeRuleCheck {
  id: string;
  tradeId: string;
  ruleId: string;
  rule?: StrategyRule;
  checked: boolean;
  createdAt: string;
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

export interface JournalScreenshot {
  id: string;
  journalId: string;
  filename: string;
  path: string;
  publicId?: string | null;
  createdAt: string;
}

export interface DailyJournal {
  id: string;
  date: string;
  notes: string;
  mood?: Mood | null;
  lessons?: string | null;
  // AI-ready fields
  energyLevel?: number | null;      // 1-10
  sleepQuality?: number | null;     // 1-10
  focusLevel?: number | null;       // 1-10
  premarketPlan?: boolean;          // Did user have a plan?
  sentimentScore?: number | null;   // AI-computed (-1 to 1)
  screenshots?: JournalScreenshot[];
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  id: string;
  defaultRisk: number;
  currency: string;
  theme: 'light' | 'dark';
  defaultAccountId?: string | null;
}

export interface TradeFormData {
  symbol: string;
  side: TradeSide;
  tradeTime: string;
  exitTime?: string | null;
  setup?: string;
  risk: number;
  result?: number;
  execution: Execution;
  isBreakEven?: boolean;
  notes?: string;
  strategyId?: string;
  accountId?: string | null;
  // AI-ready fields (user input)
  preTradeMood?: PreTradeMood | null;
  postTradeMood?: PostTradeMood | null;
  confidenceLevel?: number | null;
  mistake?: TradeMistake | null;
}

export interface TradeFilters {
  dateFrom?: string;
  dateTo?: string;
  symbol?: string;
  side?: TradeSide;
  execution?: Execution;
  strategyId?: string;
  setup?: string;
  resultMin?: number;
  resultMax?: number;
  accountId?: string | null;
  userId?: string;
}

export interface AnalyticsData {
  totalResult: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageWin: number;
  averageLoss: number;
  averageWinnerR: number;
  averageLoserR: number;
  largestWin: number;
  largestLoss: number;
  totalRisk: number;
  executionRate: number; // % of PASS executions
  avgWinnerTime?: number; // Average time in winning trades (minutes)
  avgLoserTime?: number; // Average time in losing trades (minutes)
}

export interface TradeTimeStats {
  avgWinnerTime: number; // minutes
  avgLoserTime: number; // minutes
  avgBreakevenTime: number; // minutes
  winnerCount: number;
  loserCount: number;
  breakevenCount: number;
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
  averageRuleSatisfaction: number;
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
