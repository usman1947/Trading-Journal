'use client';

import { useState, useEffect, useRef } from 'react';
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
  Avatar,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  AccountBalance as AccountIcon,
  AttachMoney as MoneyIcon,
  Person as PersonIcon,
  CameraAlt as CameraIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setThemeMode, setSelectedAccountId, showSnackbar } from '@/store/slices/uiSlice';
import { setUser } from '@/store/slices/authSlice';
import {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useGetAccountsQuery,
  useCreateAccountMutation,
  useUpdateAccountMutation,
  useDeleteAccountMutation,
  useUpdateProfileMutation,
} from '@/store';
import { Account } from '@/types';
import { formatCurrency } from '@/utils/formatters';

interface AccountDialogData {
  id?: string;
  name: string;
  description: string;
  initialBalance: number;
  isSwingAccount: boolean;
}

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state) => state.ui.themeMode);
  const user = useAppSelector((state) => state.auth.user);

  const { data: settings, isLoading: settingsLoading } = useGetSettingsQuery({});
  const { data: accounts = [], isLoading: accountsLoading } = useGetAccountsQuery({});
  const [updateSettings] = useUpdateSettingsMutation();
  const [createAccount] = useCreateAccountMutation();
  const [updateAccount] = useUpdateAccountMutation();
  const [deleteAccount] = useDeleteAccountMutation();
  const [updateProfile] = useUpdateProfileMutation();

  // Profile state
  const [profileName, setProfileName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [defaultRisk, setDefaultRisk] = useState<number>(100);
  const [defaultAccountId, setDefaultAccountId] = useState<string | null>(null);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountDialogData, setAccountDialogData] = useState<AccountDialogData>({
    name: '',
    description: '',
    initialBalance: 0,
    isSwingAccount: false,
  });
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileName(user.name);
    }
  }, [user]);

  useEffect(() => {
    if (settings) {
      setDefaultRisk(settings.defaultRisk);
      setDefaultAccountId(settings.defaultAccountId ?? null);
    }
  }, [settings]);

  const handleSaveProfileName = async () => {
    if (!profileName.trim()) return;
    setSavingProfile(true);
    try {
      const updatedUser = await updateProfile({ name: profileName.trim() }).unwrap();
      dispatch(setUser(updatedUser));
      dispatch(showSnackbar({ message: 'Profile updated successfully', severity: 'success' }));
    } catch {
      dispatch(showSnackbar({ message: 'Failed to update profile', severity: 'error' }));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      dispatch(showSnackbar({ message: 'New passwords do not match', severity: 'error' }));
      return;
    }
    if (newPassword.length < 8) {
      dispatch(showSnackbar({ message: 'Password must be at least 8 characters', severity: 'error' }));
      return;
    }
    setSavingPassword(true);
    try {
      await updateProfile({ currentPassword, newPassword }).unwrap();
      dispatch(showSnackbar({ message: 'Password changed successfully', severity: 'success' }));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'data' in error
        ? (error.data as { error?: string })?.error || 'Failed to change password'
        : 'Failed to change password';
      dispatch(showSnackbar({ message, severity: 'error' }));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      dispatch(showSnackbar({ message: 'Please select an image file', severity: 'error' }));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      dispatch(showSnackbar({ message: 'Image must be less than 5MB', severity: 'error' }));
      return;
    }

    setUploadingAvatar(true);
    try {
      // Upload to Cloudinary via our upload endpoint
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/upload?folder=avatars', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const { url } = await uploadResponse.json();

      // Update user profile with new avatar URL
      const updatedUser = await updateProfile({ avatarUrl: url }).unwrap();
      dispatch(setUser(updatedUser));
      dispatch(showSnackbar({ message: 'Avatar updated successfully', severity: 'success' }));
    } catch {
      dispatch(showSnackbar({ message: 'Failed to upload avatar', severity: 'error' }));
    } finally {
      setUploadingAvatar(false);
      // Clear the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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
        initialBalance: account.initialBalance ?? 0,
        isSwingAccount: account.isSwingAccount || false,
      });
    } else {
      setAccountDialogData({ name: '', description: '', initialBalance: 0, isSwingAccount: false });
    }
    setAccountDialogOpen(true);
  };

  const handleCloseAccountDialog = () => {
    setAccountDialogOpen(false);
    setAccountDialogData({ name: '', description: '', initialBalance: 0, isSwingAccount: false });
  };

  const handleSaveAccount = async () => {
    try {
      if (accountDialogData.id) {
        await updateAccount({
          id: accountDialogData.id,
          name: accountDialogData.name,
          description: accountDialogData.description || null,
          initialBalance: accountDialogData.initialBalance,
          isSwingAccount: accountDialogData.isSwingAccount,
        }).unwrap();
        dispatch(showSnackbar({ message: 'Account updated successfully', severity: 'success' }));
      } else {
        await createAccount({
          name: accountDialogData.name,
          description: accountDialogData.description || null,
          initialBalance: accountDialogData.initialBalance,
          isSwingAccount: accountDialogData.isSwingAccount,
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
        {/* Profile Section */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon />
                Profile
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                {/* Avatar */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Box sx={{ position: 'relative' }}>
                    <Avatar
                      src={user?.avatarUrl || undefined}
                      sx={{
                        width: 80,
                        height: 80,
                        bgcolor: 'primary.main',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                      }}
                      onClick={handleAvatarClick}
                    >
                      {user?.name ? getInitials(user.name) : '?'}
                    </Avatar>
                    <IconButton
                      size="small"
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        backgroundColor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        '&:hover': { backgroundColor: 'action.hover' },
                      }}
                      onClick={handleAvatarClick}
                      disabled={uploadingAvatar}
                    >
                      {uploadingAvatar ? <CircularProgress size={16} /> : <CameraIcon fontSize="small" />}
                    </IconButton>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarChange}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Click to upload a new avatar
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      JPG, PNG or GIF. Max 5MB.
                    </Typography>
                  </Box>
                </Box>

                <Divider />

                {/* Name */}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <TextField
                    label="Name"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    fullWidth
                  />
                  <Button
                    variant="contained"
                    onClick={handleSaveProfileName}
                    disabled={savingProfile || profileName === user?.name || !profileName.trim()}
                    sx={{ whiteSpace: 'nowrap', minWidth: 100 }}
                  >
                    {savingProfile ? <CircularProgress size={24} /> : 'Save'}
                  </Button>
                </Box>

                {/* Email (read-only) */}
                <TextField
                  label="Email"
                  value={user?.email || ''}
                  disabled
                  fullWidth
                  helperText="Email cannot be changed"
                />

                <Divider />

                {/* Change Password */}
                <Typography variant="subtitle1" fontWeight="medium">
                  Change Password
                </Typography>
                <TextField
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  fullWidth
                  helperText="Must be at least 8 characters"
                />
                <TextField
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  fullWidth
                  error={confirmPassword !== '' && newPassword !== confirmPassword}
                  helperText={confirmPassword !== '' && newPassword !== confirmPassword ? 'Passwords do not match' : ''}
                />
                <Button
                  variant="outlined"
                  onClick={handleChangePassword}
                  disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {savingPassword ? <CircularProgress size={24} /> : 'Change Password'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

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
                            secondary={
                              [
                                account.description || 'No description',
                                account.initialBalance > 0
                                  ? `Starting balance: ${formatCurrency(account.initialBalance)}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(' | ')
                            }
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
            <TextField
              label="Starting Balance"
              type="number"
              value={accountDialogData.initialBalance}
              onChange={(e) =>
                setAccountDialogData({
                  ...accountDialogData,
                  initialBalance: Math.max(0, Number(e.target.value)),
                })
              }
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  ),
                },
                htmlInput: { min: 0, step: 0.01 },
              }}
              helperText="Set your starting balance to track running account value in the header"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={accountDialogData.isSwingAccount}
                  onChange={(e) => setAccountDialogData({ ...accountDialogData, isSwingAccount: e.target.checked })}
                  color="primary"
                />
              }
              label="Swing Account"
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
              Swing accounts are for longer-term trades held over multiple days or weeks
            </Typography>
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
