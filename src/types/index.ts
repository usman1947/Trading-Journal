export type TradeSide = 'LONG' | 'SHORT';
export type Execution = 'PASS' | 'FAIL';
export type Mood = 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'TRENDING' | 'CHOPPY' | 'RANGING';

// AI-ready types
export type PreTradeMood = 'CONFIDENT' | 'ANXIOUS' | 'FOMO' | 'REVENGE' | 'CALM' | 'NEUTRAL';
export type PostTradeMood = 'SATISFIED' | 'FRUSTRATED' | 'RELIEVED' | 'REGRETFUL' | 'NEUTRAL';
export type TradeMistake =
  | 'FOMO'
  | 'CHASING'
  | 'EARLY_EXIT'
  | 'OVERSIZE'
  | 'REVENGE'
  | 'NO_PLAN'
  | 'IGNORED_STOP'
  | 'MOVED_STOP'
  | 'NO_STOP'
  | 'OVERTRADING';

export interface Account {
  id: string;
  name: string;
  description?: string | null;
  initialBalance: number;
  isSwingAccount: boolean;
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
  partials?: number[] | null;
  commission: number;
  execution: Execution;
  isBreakEven: boolean;
  notes?: string | null;
  // AI-ready fields
  preTradeMood?: PreTradeMood | null;
  postTradeMood?: PostTradeMood | null;
  confidenceLevel?: number | null;
  mistake?: TradeMistake | null;
  sentimentScore?: number | null; // AI-computed (-1 to 1)
  sequenceInSession?: number | null; // Calculated programmatically
  holdDurationMins?: number | null; // Calculated from exit - entry
  strategyId?: string | null;
  strategy?: Strategy | null;
  accountId?: string | null;
  account?: Account | null;
  screenshots?: Screenshot[];
  tags?: TagOnTrade[];
  // Unified trade checklist
  checkPlan: boolean;
  checkJudge: boolean;
  checkExecute: boolean;
  checkManage: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Strategy {
  id: string;
  name: string;
  description?: string | null;
  setups?: string[] | null;
  isSwingStrategy: boolean;
  trades?: Trade[];
  // Checklist descriptions (customizable per strategy)
  checkPlanDesc?: string | null;
  checkJudgeDesc?: string | null;
  checkExecuteDesc?: string | null;
  checkManageDesc?: string | null;
  screenshots?: StrategyScreenshot[];
  createdAt: string;
  updatedAt: string;
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
  energyLevel?: number | null; // 1-10
  sleepQuality?: number | null; // 1-10
  focusLevel?: number | null; // 1-10
  premarketPlan?: boolean; // Did user have a plan?
  sentimentScore?: number | null; // AI-computed (-1 to 1)
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
  partials?: number[];
  commission?: number;
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
  // Unified trade checklist
  checkPlan?: boolean;
  checkJudge?: boolean;
  checkExecute?: boolean;
  checkManage?: boolean;
}

/** Fixed checklist items for all trades/strategies */
export const CHECKLIST_ITEMS = [
  { key: 'checkPlan' as const, label: 'Plan', defaultDesc: 'Pre Market Plan' },
  {
    key: 'checkJudge' as const,
    label: 'Judge',
    defaultDesc: 'Level, Wicks, Tickers Adherence to Plan',
  },
  { key: 'checkExecute' as const, label: 'Execute', defaultDesc: 'Entry From VWAP' },
  { key: 'checkManage' as const, label: 'Manage', defaultDesc: 'Smart StopLoss Move, Adding' },
] as const;

export type ChecklistKey = (typeof CHECKLIST_ITEMS)[number]['key'];

export interface TradeFilters {
  dateFrom?: string;
  dateTo?: string;
  timeBefore?: string; // HH:mm format, e.g., "09:35"
  timeAfter?: string; // HH:mm format, e.g., "10:00"
  symbol?: string;
  side?: TradeSide;
  execution?: Execution;
  strategyId?: string;
  setup?: string;
  resultMin?: number;
  resultMax?: number;
  accountId?: string | null;
  userId?: string;
  minChecklistPercent?: number; // 0-100, filters trades by minimum checklist adherence
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
  totalCommissions: number; // Total commissions/fees paid
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

// =============================================================================
// Setup Profiler Types
// =============================================================================

/** Clustering dimensions for the Setup Profiler feature */
export type ClusterDimension = 'setup' | 'strategy' | 'timeGroup' | 'execution' | 'side';

/** Edge/Leak/Neutral classification for clusters */
export type ClusterClassification = 'EDGE' | 'LEAK' | 'NEUTRAL' | 'INSUFFICIENT_DATA';

/** Confidence level based on sample size */
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/** Dimension values that define a cluster */
export interface ClusterDimensionValue {
  name: ClusterDimension;
  value: string;
  displayLabel: string;
}

/** Statistics calculated for each cluster */
export interface ClusterStats {
  // Trade counts
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;

  // P&L Metrics
  totalPnL: number;
  grossProfit: number;
  grossLoss: number;
  avgPnL: number;

  // Win/Loss Analysis
  winRate: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;

  // R-Multiple Analysis
  avgRMultiple: number;
  avgWinnerR: number;
  avgLoserR: number;
  totalRMultiple: number;

  // Expectancy & Edge Metrics
  expectancy: number;
  expectancyR: number;
  profitFactor: number;
  payoffRatio: number;

  // Risk & Execution
  totalRisk: number;
  executionRate: number;
  passTradeWinRate: number;
  failTradeWinRate: number;

  // Time Analysis
  avgHoldDurationMins: number;

  // Sample Quality
  confidenceLevel: ConfidenceLevel;
}

/** A cluster represents a unique combination of dimension values */
export interface Cluster {
  id: string;
  dimensions: ClusterDimensionValue[];
  displayKey: string;
  stats: ClusterStats;
  classification: ClusterClassification;
  classificationScore: number;
  tradeIds: string[];
}

/** Configuration for the Setup Profiler analysis */
export interface SetupProfilerConfig {
  dimensions: ClusterDimension[];
  minSampleSize: number;
  edgeExpectancyThreshold: number;
  leakExpectancyThreshold: number;
  timeGroupIntervalMins: number;
  filters: TradeFilters;
}

/** Results from the Setup Profiler analysis */
export interface SetupProfilerResults {
  overallStats: ClusterStats;
  clusters: Cluster[];
  topEdges: Cluster[];
  topLeaks: Cluster[];
  tradesAnalyzed: number;
  dateRange: { from: string; to: string } | null;
  generatedAt: string;
  config: SetupProfilerConfig;
}

// Re-export RAG types for convenience
export * from './rag';
