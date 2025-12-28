'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Paper,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  AccountBalance as AccountIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setThemeMode, setSelectedAccountId, showSnackbar } from '@/store/slices/uiSlice';
import {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useGetAccountsQuery,
  useCreateAccountMutation,
  useUpdateAccountMutation,
  useDeleteAccountMutation,
} from '@/store';
import { Account } from '@/types';

interface AccountDialogData {
  id?: string;
  name: string;
  description: string;
}

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state) => state.ui.themeMode);

  const { data: settings, isLoading: settingsLoading } = useGetSettingsQuery({});
  const { data: accounts = [], isLoading: accountsLoading } = useGetAccountsQuery({});
  const [updateSettings] = useUpdateSettingsMutation();
  const [createAccount] = useCreateAccountMutation();
  const [updateAccount] = useUpdateAccountMutation();
  const [deleteAccount] = useDeleteAccountMutation();

  const [defaultRisk, setDefaultRisk] = useState<number>(100);
  const [defaultAccountId, setDefaultAccountId] = useState<string | null>(null);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountDialogData, setAccountDialogData] = useState<AccountDialogData>({
    name: '',
    description: '',
  });
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setDefaultRisk(settings.defaultRisk);
      setDefaultAccountId(settings.defaultAccountId ?? null);
    }
  }, [settings]);

  const handleThemeChange = async (isDark: boolean) => {
    const newTheme = isDark ? 'dark' : 'light';
    dispatch(setThemeMode(newTheme));
    try {
      await updateSettings({ theme: newTheme }).unwrap();
    } catch {
      dispatch(showSnackbar({ message: 'Failed to save theme preference', severity: 'error' }));
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSettings({
        defaultRisk,
        defaultAccountId,
      }).unwrap();
      // Also update the currently selected account to match the new default
      dispatch(setSelectedAccountId(defaultAccountId));
      dispatch(showSnackbar({ message: 'Settings saved successfully', severity: 'success' }));
    } catch {
      dispatch(showSnackbar({ message: 'Failed to save settings', severity: 'error' }));
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAccountDialog = (account?: Account) => {
    if (account) {
      setAccountDialogData({
        id: account.id,
        name: account.name,
        description: account.description || '',
      });
    } else {
      setAccountDialogData({ name: '', description: '' });
    }
    setAccountDialogOpen(true);
  };

  const handleCloseAccountDialog = () => {
    setAccountDialogOpen(false);
    setAccountDialogData({ name: '', description: '' });
  };

  const handleSaveAccount = async () => {
    try {
      if (accountDialogData.id) {
        await updateAccount({
          id: accountDialogData.id,
          name: accountDialogData.name,
          description: accountDialogData.description || null,
        }).unwrap();
        dispatch(showSnackbar({ message: 'Account updated successfully', severity: 'success' }));
      } else {
        await createAccount({
          name: accountDialogData.name,
          description: accountDialogData.description || null,
        }).unwrap();
        dispatch(showSnackbar({ message: 'Account created successfully', severity: 'success' }));
      }
      handleCloseAccountDialog();
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'data' in error
        ? (error.data as { error?: string })?.error || 'Failed to save account'
        : 'Failed to save account';
      dispatch(showSnackbar({ message, severity: 'error' }));
    }
  };

  const handleOpenDeleteDialog = (account: Account) => {
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setAccountToDelete(null);
  };

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;
    try {
      await deleteAccount(accountToDelete.id).unwrap();
      dispatch(showSnackbar({ message: 'Account deleted successfully', severity: 'success' }));
      // If the deleted account was the default, reset to paper
      if (defaultAccountId === accountToDelete.id) {
        setDefaultAccountId(null);
        await updateSettings({ defaultAccountId: null }).unwrap();
      }
      handleCloseDeleteDialog();
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'data' in error
        ? (error.data as { error?: string })?.error || 'Failed to delete account'
        : 'Failed to delete account';
      dispatch(showSnackbar({ message, severity: 'error' }));
    }
  };

  if (settingsLoading || accountsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Settings
      </Typography>

      <Grid container spacing={3}>
        {/* Appearance Section */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {themeMode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
                Appearance
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={themeMode === 'dark'}
                    onChange={(e) => handleThemeChange(e.target.checked)}
                    color="primary"
                  />
                }
                label={themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Trading Defaults Section */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MoneyIcon />
                Trading Defaults
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                <TextField
                  label="Default Risk Amount ($)"
                  type="number"
                  value={defaultRisk}
                  onChange={(e) => setDefaultRisk(Number(e.target.value))}
                  fullWidth
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="This amount will be pre-filled when creating new trades"
                />

                <FormControl fullWidth>
                  <InputLabel>Default Account</InputLabel>
                  <Select
                    value={defaultAccountId ?? 'paper'}
                    onChange={(e) => setDefaultAccountId(e.target.value === 'paper' ? null : e.target.value)}
                    label="Default Account"
                  >
                    <MenuItem value="paper">Paper Account</MenuItem>
                    {accounts.map((account: Account) => (
                      <MenuItem key={account.id} value={account.id}>
                        {account.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  variant="contained"
                  onClick={handleSaveSettings}
                  disabled={saving}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {saving ? <CircularProgress size={24} /> : 'Save Settings'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Accounts Section */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccountIcon />
                  Trading Accounts
                </Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenAccountDialog()}
                  variant="outlined"
                  size="small"
                >
                  Add Account
                </Button>
              </Box>

              <Alert severity="info" sx={{ mb: 2 }}>
                The Paper Account is always available and cannot be deleted. Trades without an account are considered paper trades.
              </Alert>

              <Paper variant="outlined">
                <List disablePadding>
                  <ListItem sx={{ backgroundColor: 'action.hover' }}>
                    <ListItemText
                      primary="Paper Account"
                      secondary="Default account for practice trades"
                    />
                  </ListItem>
                  <Divider />
                  {accounts.length === 0 ? (
                    <ListItem>
                      <ListItemText
                        primary="No accounts created yet"
                        secondary="Create an account to track real trades separately"
                        sx={{ color: 'text.secondary' }}
                      />
                    </ListItem>
                  ) : (
                    accounts.map((account: Account, index: number) => (
                      <Box key={account.id}>
                        <ListItem>
                          <ListItemText
                            primary={account.name}
                            secondary={account.description || 'No description'}
                          />
                          <ListItemSecondaryAction>
                            <IconButton
                              edge="end"
                              onClick={() => handleOpenAccountDialog(account)}
                              sx={{ mr: 1 }}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              edge="end"
                              onClick={() => handleOpenDeleteDialog(account)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                        {index < accounts.length - 1 && <Divider />}
                      </Box>
                    ))
                  )}
                </List>
              </Paper>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Account Create/Edit Dialog */}
      <Dialog open={accountDialogOpen} onClose={handleCloseAccountDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {accountDialogData.id ? 'Edit Account' : 'Create Account'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Account Name"
              value={accountDialogData.name}
              onChange={(e) => setAccountDialogData({ ...accountDialogData, name: e.target.value })}
              fullWidth
              required
              autoFocus
            />
            <TextField
              label="Description (optional)"
              value={accountDialogData.description}
              onChange={(e) => setAccountDialogData({ ...accountDialogData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAccountDialog}>Cancel</Button>
          <Button
            onClick={handleSaveAccount}
            variant="contained"
            disabled={!accountDialogData.name.trim()}
          >
            {accountDialogData.id ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the account &ldquo;{accountToDelete?.name}&rdquo;?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Accounts with trades cannot be deleted. You must move or delete the trades first.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleDeleteAccount} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
