export interface WeeklyCoachReport {
  id: string;
  weekStart: string;
  weekEnd: string;
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  avgWinnerR: number;
  avgLoserR: number;
  executionRate: number;
  avgConfidence: number | null;
  mostCommonMistake: string | null;
  moodDistribution: Record<string, number> | null;
  summary: string;
  commonTheme: string | null;
  progressNotes: string | null;
  strengths: string[];
  improvements: string[];
  actionItems: string[];
  modelVersion: string;
  generatedAt: string;
  accountId: string | null;
}

export interface WeeklyCoachResponse {
  exists: boolean;
  report: WeeklyCoachReport | null;
}

export interface GenerateCoachResponse {
  success: boolean;
  report: WeeklyCoachReport;
}
