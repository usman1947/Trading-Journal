'use client';

import {
  Box,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  Typography,
  CircularProgress,
} from '@mui/material';
import { AccountBalance as AccountIcon } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSelectedAccountId } from '@/store/slices/uiSlice';
import { useGetAccountsQuery } from '@/store';
import { Account } from '@/types';

export default function AccountSelector() {
  const dispatch = useAppDispatch();
  const selectedAccountId = useAppSelector((state) => state.ui.selectedAccountId);
  const { data: accounts = [], isLoading } = useGetAccountsQuery({});

  const handleChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    dispatch(setSelectedAccountId(value === 'paper' ? null : value));
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', px: 1 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  return (
    <FormControl size="small" sx={{ minWidth: 150 }}>
      <Select
        value={selectedAccountId ?? 'paper'}
        onChange={handleChange}
        displayEmpty
        variant="outlined"
        sx={{
          backgroundColor: 'background.default',
          '& .MuiSelect-select': {
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            py: 0.75,
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'divider',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'primary.main',
          },
        }}
        renderValue={(value) => {
          const account = accounts.find((a: Account) => a.id === value);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountIcon fontSize="small" color="primary" />
              <Typography variant="body2" noWrap>
                {value === 'paper' ? 'Paper Account' : account?.name || 'Select Account'}
              </Typography>
            </Box>
          );
        }}
      >
        <MenuItem value="paper">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountIcon fontSize="small" />
            <Typography variant="body2">Paper Account</Typography>
          </Box>
        </MenuItem>
        {accounts.map((account: Account) => (
          <MenuItem key={account.id} value={account.id}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountIcon fontSize="small" />
              <Typography variant="body2">{account.name}</Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
