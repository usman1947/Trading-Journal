'use client';

import Grid from '@mui/material/Grid';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';

interface DateTimePickerGroupProps {
  entryDateTime: string;
  exitDateTime?: string | null;
  onEntryDateChange: (date: Date) => void;
  onEntryTimeChange: (time: Date) => void;
  onExitTimeChange: (time: Date | null) => void;
  entryTimeLabel?: string;
  exitTimeLabel?: string;
  showExitTime?: boolean;
  disabled?: boolean;
  error?: boolean;
  touched?: boolean;
}

export default function DateTimePickerGroup({
  entryDateTime,
  exitDateTime,
  onEntryDateChange,
  onEntryTimeChange,
  onExitTimeChange,
  entryTimeLabel = 'Entry Time',
  exitTimeLabel = 'Exit Time',
  showExitTime = true,
  disabled = false,
  error = false,
  touched = false,
}: DateTimePickerGroupProps) {
  return (
    <>
      {/* Date */}
      <Grid size={{ xs: 12, sm: 6 }}>
        <DatePicker
          label="Date"
          value={new Date(entryDateTime)}
          onChange={(date) => {
            if (date) {
              const currentTime = new Date(entryDateTime);
              date.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds());
              onEntryDateChange(date);
            }
          }}
          disabled={disabled}
          slotProps={{
            textField: {
              fullWidth: true,
              error: touched && error,
            },
          }}
        />
      </Grid>

      {/* Entry Time */}
      <Grid size={{ xs: showExitTime ? 6 : 12, sm: 6 }}>
        <TimePicker
          label={entryTimeLabel}
          value={new Date(entryDateTime)}
          onChange={(time) => {
            if (time) {
              const currentDate = new Date(entryDateTime);
              currentDate.setHours(time.getHours(), time.getMinutes(), time.getSeconds());
              onEntryTimeChange(currentDate);
            }
          }}
          disabled={disabled}
          slotProps={{
            textField: {
              fullWidth: true,
            },
          }}
        />
      </Grid>

      {/* Exit Time */}
      {showExitTime && (
        <Grid size={{ xs: 6, sm: 6 }}>
          <TimePicker
            label={exitTimeLabel}
            value={exitDateTime ? new Date(exitDateTime) : new Date(entryDateTime)}
            onChange={(time) => {
              if (time) {
                // Use the trade date for the exit time
                const tradeDate = new Date(entryDateTime);
                const exitDate = new Date(tradeDate);
                exitDate.setHours(time.getHours(), time.getMinutes(), time.getSeconds());
                onExitTimeChange(exitDate);
              } else {
                onExitTimeChange(null);
              }
            }}
            disabled={disabled}
            slotProps={{
              textField: {
                fullWidth: true,
              },
              field: {
                clearable: true,
              },
            }}
          />
        </Grid>
      )}
    </>
  );
}
