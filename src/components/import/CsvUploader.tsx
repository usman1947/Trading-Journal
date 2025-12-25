'use client';

import { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Alert,
  CircularProgress,
} from '@mui/material';
import { CloudUpload as UploadIcon, CheckCircle as SuccessIcon } from '@mui/icons-material';
import { parseCSV, mapCSVToTrades, ParsedCSV } from '@/lib/csvParser';
import { useImportTradesMutation } from '@/store';
import { useAppDispatch } from '@/store/hooks';
import { showSnackbar } from '@/store/slices/uiSlice';
import ColumnMapper from './ColumnMapper';
import type { CSVColumnMapping } from '@/types';

const steps = ['Upload CSV', 'Map Columns', 'Review & Import'];

export default function CsvUploader() {
  const dispatch = useAppDispatch();
  const [importTrades, { isLoading }] = useImportTradesMutation();
  const [activeStep, setActiveStep] = useState(0);
  const [parsedData, setParsedData] = useState<ParsedCSV | null>(null);
  const [mapping, setMapping] = useState<CSVColumnMapping | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; errors?: { row: number; error: string }[] } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      setError(null);
      const parsed = await parseCSV(file);

      if (parsed.headers.length === 0 || parsed.data.length === 0) {
        setError('The CSV file appears to be empty or invalid.');
        return;
      }

      setParsedData(parsed);
      setActiveStep(1);
    } catch (err) {
      setError('Failed to parse CSV file. Please check the file format.');
      console.error(err);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.csv')) {
        handleFileUpload(file);
      } else {
        setError('Please upload a CSV file.');
      }
    },
    [handleFileUpload]
  );

  const handleMappingComplete = (columnMapping: CSVColumnMapping) => {
    setMapping(columnMapping);
    setActiveStep(2);
  };

  const handleImport = async () => {
    if (!parsedData || !mapping) return;

    try {
      const trades = mapCSVToTrades(parsedData.data, mapping);
      const response = await importTrades(trades).unwrap();
      setResult(response);
      dispatch(
        showSnackbar({
          message: `Successfully imported ${response.imported} trades`,
          severity: 'success',
        })
      );
      setActiveStep(3);
    } catch (err) {
      setError('Failed to import trades. Please check the data and try again.');
      console.error(err);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setParsedData(null);
    setMapping(null);
    setError(null);
    setResult(null);
  };

  return (
    <Box>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {activeStep === 0 && (
        <Card>
          <CardContent>
            <Box
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              sx={{
                border: '2px dashed',
                borderColor: dragOver ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 6,
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: dragOver ? 'action.hover' : 'background.paper',
                transition: 'all 0.2s',
              }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.csv';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleFileUpload(file);
                };
                input.click();
              }}
            >
              <UploadIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Drag & drop your CSV file here
              </Typography>
              <Typography color="text.secondary" gutterBottom>
                or click to browse
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Supported format: CSV with headers
              </Typography>
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Expected CSV Format:
              </Typography>
              <Typography variant="body2" color="text.secondary" component="pre" sx={{ fontFamily: 'monospace' }}>
                Symbol,Side,Time,Risk,Result,Execution,Setup
                <br />
                AAPL,LONG,2024-01-15 09:30,100,250,PASS,Gap Up
                <br />
                TSLA,SHORT,2024-01-15 10:15,150,-75,FAIL,Breakdown
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {activeStep === 1 && parsedData && (
        <ColumnMapper
          headers={parsedData.headers}
          sampleData={parsedData.data.slice(0, 3)}
          onComplete={handleMappingComplete}
          onBack={() => setActiveStep(0)}
        />
      )}

      {activeStep === 2 && parsedData && mapping && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Review Import
            </Typography>
            <Typography color="text.secondary" gutterBottom>
              Ready to import {parsedData.data.length} trades with the following mapping:
            </Typography>

            <Box sx={{ my: 3, p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Symbol:</strong> {mapping.symbol}
              </Typography>
              <Typography variant="body2">
                <strong>Side:</strong> {mapping.side}
              </Typography>
              <Typography variant="body2">
                <strong>Trade Time:</strong> {mapping.tradeTime}
              </Typography>
              <Typography variant="body2">
                <strong>Risk $:</strong> {mapping.risk}
              </Typography>
              {mapping.result && (
                <Typography variant="body2">
                  <strong>Result $:</strong> {mapping.result}
                </Typography>
              )}
              {mapping.execution && (
                <Typography variant="body2">
                  <strong>Execution:</strong> {mapping.execution}
                </Typography>
              )}
              {mapping.setup && (
                <Typography variant="body2">
                  <strong>Setup:</strong> {mapping.setup}
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" onClick={() => setActiveStep(1)}>
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleImport}
                disabled={isLoading}
              >
                {isLoading ? <CircularProgress size={24} /> : `Import ${parsedData.data.length} Trades`}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {activeStep === 3 && result && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <SuccessIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Import Complete!
            </Typography>
            <Typography color="text.secondary" gutterBottom>
              Successfully imported {result.imported} trades.
            </Typography>
            {result.errors && result.errors.length > 0 && (
              <Alert severity="warning" sx={{ mt: 2, textAlign: 'left' }}>
                {result.errors.length} rows had errors and were skipped.
              </Alert>
            )}
            <Button variant="contained" onClick={handleReset} sx={{ mt: 3 }}>
              Import More
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
