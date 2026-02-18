'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Box,
  Typography,
  Tooltip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  ShowChart as TradesIcon,
  Analytics as AnalyticsIcon,
  Book as JournalIcon,
  Category as StrategiesIcon,
  Insights as ProfilerIcon,
  Checklist as RulesIcon,
} from '@mui/icons-material';
import { useAppSelector } from '@/store/hooks';
import { useGetAccountsQuery } from '@/store';
import { Account } from '@/types';

export const DRAWER_WIDTH = 240;
export const DRAWER_WIDTH_COLLAPSED = 64;

const allMenuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/', showForSwing: true },
  { text: 'Trades', icon: <TradesIcon />, path: '/trades', showForSwing: true },
  { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics', showForSwing: false },
  { text: 'Setup Profiler', icon: <ProfilerIcon />, path: '/setup-profiler', showForSwing: false },
  { text: 'Daily Rules', icon: <RulesIcon />, path: '/daily-rules', showForSwing: false },
  { text: 'Journal', icon: <JournalIcon />, path: '/journal', showForSwing: false },
  { text: 'Strategies', icon: <StrategiesIcon />, path: '/strategies', showForSwing: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const selectedAccountId = useAppSelector((state) => state.ui.selectedAccountId);
  const { data: accounts = [] } = useGetAccountsQuery({});

  // Check if the selected account is a swing account
  const isSwingAccount = useMemo(() => {
    if (!selectedAccountId) return false;
    const account = accounts.find((a: Account) => a.id === selectedAccountId);
    return account?.isSwingAccount || false;
  }, [selectedAccountId, accounts]);

  // Filter menu items based on account type
  const menuItems = useMemo(() => {
    if (isSwingAccount) {
      return allMenuItems.filter((item) => item.showForSwing);
    }
    return allMenuItems;
  }, [isSwingAccount]);

  const drawerWidth = sidebarOpen ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
          overflowX: 'hidden',
          transition: (theme) =>
            theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
        },
      }}
    >
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
          <TradesIcon color="primary" />
          {sidebarOpen && (
            <Typography variant="h6" color="primary" fontWeight="bold" noWrap>
              TradeJournal
            </Typography>
          )}
        </Box>
      </Toolbar>
      <Divider />
      <List sx={{ px: sidebarOpen ? 1 : 0.5 }}>
        {menuItems.map((item) => {
          const isActive =
            pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));

          const listItemButton = (
            <ListItemButton
              component={Link}
              href={item.path}
              selected={isActive}
              sx={{
                borderRadius: 2,
                minHeight: 48,
                justifyContent: sidebarOpen ? 'initial' : 'center',
                px: sidebarOpen ? 2 : 2.5,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: sidebarOpen ? 40 : 0,
                  mr: sidebarOpen ? 'auto' : 0,
                  justifyContent: 'center',
                  color: isActive ? 'inherit' : 'text.secondary',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {sidebarOpen && <ListItemText primary={item.text} />}
            </ListItemButton>
          );

          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              {sidebarOpen ? (
                listItemButton
              ) : (
                <Tooltip title={item.text} placement="right">
                  {listItemButton}
                </Tooltip>
              )}
            </ListItem>
          );
        })}
      </List>
    </Drawer>
  );
}
