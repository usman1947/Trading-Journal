'use client';

import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import type { CSVColumnMapping } from '@/types';

interface ColumnMapperProps {
  headers: string[];
  sampleData: Record<string, string>[];
  onComplete: (mapping: CSVColumnMapping) => void;
  onBack: () => void;
}

const REQUIRED_FIELDS = [
  { key: 'symbol', label: 'Symbol', hint: 'Stock ticker symbol' },
  { key: 'side', label: 'Side', hint: 'LONG/SHORT or BUY/SELL' },
  { key: 'tradeTime', label: 'Trade Time', hint: 'When the trade was taken' },
  { key: 'risk', label: 'Risk $', hint: 'Risk amount in dollars' },
];

const OPTIONAL_FIELDS = [
  { key: 'result', label: 'Result $', hint: 'P&L result in dollars' },
  { key: 'execution', label: 'Execution', hint: 'PASS or FAIL' },
  { key: 'setup', label: 'Setup', hint: 'Trade setup description' },
];

export default function ColumnMapper({
  headers,
  sampleData,
  onComplete,
  onBack,
}: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Partial<CSVColumnMapping>>({});
  const [error, setError] = useState<string | null>(null);

  // Auto-detect mapping based on header names
  const autoDetect = () => {
    const detected: Partial<CSVColumnMapping> = {};

    headers.forEach((header) => {
      const lower = header.toLowerCase();
      if (lower.includes('symbol') || lower.includes('ticker')) {
        detected.symbol = header;
      } else if (lower.includes('side') || lower.includes('action') || lower === 'type') {
        detected.side = header;
      } else if (lower.includes('time') || lower.includes('date')) {
        detected.tradeTime = header;
      } else if (lower.includes('risk')) {
        detected.risk = header;
      } else if (lower.includes('result') || lower.includes('pnl') || lower.includes('p&l')) {
        detected.result = header;
      } else if (lower.includes('execution') || lower.includes('pass') || lower.includes('fail')) {
        detected.execution = header;
      } else if (lower.includes('setup')) {
        detected.setup = header;
      }
    });

    setMapping(detected);
  };

  const handleSubmit = () => {
    // Validate required fields
    const missing = REQUIRED_FIELDS.filter((field) => !mapping[field.key as keyof CSVColumnMapping]);
    if (missing.length > 0) {
      setError(`Missing required fields: ${missing.map((f) => f.label).join(', ')}`);
      return;
    }

    onComplete(mapping as CSVColumnMapping);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Map CSV Columns</Typography>
          <Button variant="outlined" size="small" onClick={autoDetect}>
            Auto-Detect
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" gutterBottom color="primary">
              Required Fields
            </Typography>
            {REQUIRED_FIELDS.map((field) => (
              <FormControl key={field.key} fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>{field.label} *</InputLabel>
                <Select
                  value={mapping[field.key as keyof CSVColumnMapping] || ''}
                  label={`${field.label} *`}
                  onChange={(e) =>
                    setMapping({ ...mapping, [field.key]: e.target.value })
                  }
                >
                  <MenuItem value="">-- Select Column --</MenuItem>
                  {headers.map((header) => (
                    <MenuItem key={header} value={header}>
                      {header}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ))}
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              Optional Fields
            </Typography>
            {OPTIONAL_FIELDS.map((field) => (
              <FormControl key={field.key} fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>{field.label}</InputLabel>
                <Select
                  value={mapping[field.key as keyof CSVColumnMapping] || ''}
                  label={field.label}
                  onChange={(e) =>
                    setMapping({ ...mapping, [field.key]: e.target.value })
                  }
                >
                  <MenuItem value="">-- Not Mapped --</MenuItem>
                  {headers.map((header) => (
                    <MenuItem key={header} value={header}>
                      {header}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ))}
          </Grid>
        </Grid>

        <Typography variant="subtitle2" sx={{ mt: 3, mb: 2 }}>
          Sample Data Preview
        </Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {headers.map((header) => (
                  <TableCell key={header} sx={{ fontWeight: 'bold' }}>
                    {header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sampleData.map((row, idx) => (
                <TableRow key={idx}>
                  {headers.map((header) => (
                    <TableCell key={header}>{row[header]}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button variant="outlined" onClick={onBack}>
            Back
          </Button>
          <Button variant="contained" onClick={handleSubmit}>
            Continue
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
