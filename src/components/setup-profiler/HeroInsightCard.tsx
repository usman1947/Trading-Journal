'use client';

import { Box, Card, CardContent, Typography, Chip, Stack } from '@mui/material';
import {
  TrendingUp as EdgeIcon,
  TrendingDown as LeakIcon,
  Lightbulb as OpportunityIcon,
} from '@mui/icons-material';
import type { PatternInsight } from '@/lib/setup-profiler';
import { formatCurrency } from '@/utils/formatters';

interface HeroInsightCardProps {
  topLeak: PatternInsight | null;
  topEdge: PatternInsight | null;
  isLoading?: boolean;
}

// Softer, more eye-friendly colors for dark mode
const COLORS = {
  edge: {
    bg: 'rgba(74, 222, 128, 0.08)', // Soft green background
    border: 'rgba(74, 222, 128, 0.3)', // Soft green border
    icon: '#4ade80', // Emerald-400
    text: '#86efac', // Lighter for titles
  },
  leak: {
    bg: 'rgba(248, 113, 113, 0.08)', // Soft red background
    border: 'rgba(248, 113, 113, 0.3)', // Soft red border
    icon: '#f87171', // Rose-400
    text: '#fca5a5', // Lighter for titles
  },
  info: {
    bg: 'rgba(96, 165, 250, 0.08)', // Soft blue background
    border: 'rgba(96, 165, 250, 0.3)',
    icon: '#60a5fa',
  },
};

function InsightCard({ insight, type }: { insight: PatternInsight; type: 'edge' | 'leak' }) {
  const isEdge = type === 'edge';
  const Icon = isEdge ? EdgeIcon : LeakIcon;
  const colors = isEdge ? COLORS.edge : COLORS.leak;

  return (
    <Card
      sx={{
        bgcolor: colors.bg,
        border: `1px solid ${colors.border}`,
        boxShadow: 'none',
      }}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Icon sx={{ color: colors.icon }} />
          <Typography variant="subtitle1" fontWeight={600} sx={{ color: colors.text }}>
            {isEdge ? 'Your Strongest Edge' : 'Your Biggest Leak'}
          </Typography>
        </Box>

        {/* Headline */}
        <Typography variant="body1" fontWeight={500} sx={{ mb: 0.5 }}>
          {insight.headline}
        </Typography>

        {/* Detail */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {insight.detail}
        </Typography>

        {/* Stats Chips */}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
          <Chip
            size="small"
            label={`${insight.stats.totalTrades} trades`}
            variant="outlined"
            sx={{ borderColor: 'divider' }}
          />
          <Chip
            size="small"
            label={`${insight.stats.winRate.toFixed(0)}% win rate`}
            variant="outlined"
            sx={{
              borderColor: insight.stats.winRate >= 50 ? COLORS.edge.border : COLORS.leak.border,
              color: insight.stats.winRate >= 50 ? COLORS.edge.icon : COLORS.leak.icon,
            }}
          />
          <Chip
            size="small"
            label={formatCurrency(insight.stats.totalPnL)}
            variant="outlined"
            sx={{
              borderColor: insight.stats.totalPnL >= 0 ? COLORS.edge.border : COLORS.leak.border,
              color: insight.stats.totalPnL >= 0 ? COLORS.edge.icon : COLORS.leak.icon,
            }}
          />
          <Chip
            size="small"
            label={insight.confidence}
            variant="outlined"
            sx={{ borderColor: 'divider' }}
          />
        </Stack>

        {/* Action */}
        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
          {insight.suggestedAction}
        </Typography>
      </CardContent>
    </Card>
  );
}

function NoInsightsCard() {
  return (
    <Card
      sx={{
        bgcolor: COLORS.info.bg,
        border: `1px solid ${COLORS.info.border}`,
        boxShadow: 'none',
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <OpportunityIcon sx={{ color: COLORS.info.icon }} />
          <Typography variant="subtitle1" fontWeight={600}>
            Keep Trading!
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          We need more trades to identify clear patterns. Keep logging your trades and check back
          soon.
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function HeroInsightCard({ topLeak, topEdge, isLoading }: HeroInsightCardProps) {
  if (isLoading) {
    return (
      <Card sx={{ bgcolor: 'action.hover', boxShadow: 'none' }}>
        <CardContent>
          <Box
            sx={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography color="text.secondary">Analyzing your patterns...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // No insights to show
  if (!topEdge && !topLeak) {
    return <NoInsightsCard />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Show leak first (actionable - stop the bleeding) */}
      {topLeak && <InsightCard insight={topLeak} type="leak" />}

      {/* Then show edge (reinforce good behavior) */}
      {topEdge && <InsightCard insight={topEdge} type="edge" />}
    </Box>
  );
}
