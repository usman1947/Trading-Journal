'use client';

import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Add as AddIcon,
  ShowChart as LogoIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleSidebar, toggleThemeMode } from '@/store/slices/uiSlice';
import AccountSelector from './AccountSelector';

export default function Header() {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state) => state.ui.themeMode);

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'background.paper',
        color: 'text.primary',
        boxShadow: 'none',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="toggle menu"
          onClick={() => dispatch(toggleSidebar())}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
          <LogoIcon color="primary" />
          <Typography variant="h6" fontWeight="bold" color="primary">
            Journal
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />
        
        <Box sx={{ mr: 2 }}>
          <AccountSelector />
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Add New Trade">
            <IconButton
              component={Link}
              href="/trades/new"
              color="primary"
              sx={{
                backgroundColor: 'primary.main',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
              }}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} mode`}>
            <IconButton
              color="inherit"
              onClick={() => dispatch(toggleThemeMode())}
            >
              {themeMode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Settings">
            <IconButton
              component={Link}
              href="/settings"
              color="inherit"
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
