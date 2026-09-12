import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Typography, Tooltip, BottomNavigation, BottomNavigationAction, Paper, IconButton,
} from '@mui/material'
import MenuOpenIcon from '@mui/icons-material/MenuOpen'
import MenuIcon from '@mui/icons-material/Menu'
import { useAuthStore } from '../store/authStore'

const staticNavItems = [
  { to: '/todos', label: 'Todos', icon: '✅', adminOnly: false },
]
const adminNavItems = [
  { to: '/admin', label: 'Admin', icon: '🔐', adminOnly: true },
]

const SIDEBAR_W = 200
const RAIL_W = 52
const COLLAPSE_KEY = 'adhdoit.sidebarCollapsed'

export default function Layout() {
  const { user, role, signOut } = useAuthStore()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1')

  function toggleCollapsed() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      return next
    })
  }

  const navItems = [...staticNavItems, ...(role === 'admin' ? adminNavItems : [])]
  const width = collapsed ? RAIL_W : SIDEBAR_W

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* Sidebar (desktop) */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'flex' },
          width,
          flexShrink: 0,
          transition: 'width 0.2s ease',
          '& .MuiDrawer-paper': {
            width,
            boxSizing: 'border-box',
            bgcolor: '#111827',
            borderRight: '1px solid #1f2937',
            display: 'flex',
            flexDirection: 'column',
            overflowX: 'hidden',
            transition: 'width 0.2s ease',
          },
        }}
      >
        {/* Brand + collapse toggle */}
        <Box sx={{ px: collapsed ? 0 : 2.5, py: 2, borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: 1 }}>
          {!collapsed && (
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', letterSpacing: '-0.01em', fontSize: 15 }}>
                ADHDoit
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                Get things done, one at a time
              </Typography>
            </Box>
          )}
          <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right">
            <IconButton onClick={toggleCollapsed} size="small" sx={{ color: 'text.secondary', flexShrink: 0 }}>
              {collapsed ? <MenuIcon sx={{ fontSize: 20 }} /> : <MenuOpenIcon sx={{ fontSize: 20 }} />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Nav links */}
        <List sx={{ flex: 1, px: collapsed ? 0.5 : 1, py: 1.5, overflowY: 'auto' }} disablePadding>
          {navItems.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} end style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <ListItem disablePadding sx={{ mb: 0.25 }}>
                  <Tooltip title={collapsed ? label : ''} placement="right">
                    <ListItemButton
                      selected={isActive}
                      sx={{
                        borderRadius: 2, py: 1, minHeight: 36,
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        px: collapsed ? 1 : 2,
                        '&.Mui-selected': { bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: collapsed ? 0 : 28, fontSize: 16, justifyContent: 'center' }}>{icon}</ListItemIcon>
                      {!collapsed && (
                        <ListItemText primary={label} slotProps={{ primary: { style: { fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? 'white' : '#9ca3af' } } }} />
                      )}
                    </ListItemButton>
                  </Tooltip>
                </ListItem>
              )}
            </NavLink>
          ))}
        </List>

        {/* Footer */}
        {!collapsed && (
          <Box sx={{ px: 2.5, py: 2, borderTop: '1px solid #1f2937' }}>
            <Tooltip title={user?.email ?? ''} placement="top">
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: 11 }}>
                {user?.email}
              </Typography>
            </Tooltip>
            <Box
              component="button"
              onClick={() => signOut()}
              sx={{ display: 'block', mt: 0.75, color: 'text.disabled', cursor: 'pointer', background: 'none', border: 'none', p: 0, fontSize: 11, '&:hover': { color: 'text.secondary' } }}
            >
              Sign out
            </Box>
          </Box>
        )}
        {collapsed && (
          <Box sx={{ py: 2, borderTop: '1px solid #1f2937', display: 'flex', justifyContent: 'center' }}>
            <Tooltip title="Sign out" placement="right">
              <IconButton onClick={() => signOut()} size="small" sx={{ color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
                <Typography sx={{ fontSize: 15 }}>⏻</Typography>
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          overflowY: 'auto',
          bgcolor: 'background.default',
          p: { xs: 2, md: 3 },
          pb: { xs: '72px', md: 3 },
        }}
      >
        {/* Mobile header */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', fontSize: 14 }}>
              ADHDoit
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
              component="button"
              onClick={() => signOut()}
              sx={{ color: 'text.disabled', cursor: 'pointer', background: 'none', border: 'none', p: 0, fontSize: 11, '&:hover': { color: 'text.secondary' } }}
            >
              Sign out
            </Box>
          </Box>
        </Box>

        <Outlet />
      </Box>

      {/* Bottom nav (mobile) */}
      <Paper
        sx={{
          display: { xs: 'block', md: 'none' },
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          borderTop: '1px solid #1f2937',
          bgcolor: '#111827',
        }}
        elevation={0}
      >
        <BottomNavigation sx={{ bgcolor: 'transparent', height: 56 }}>
          {navItems.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} style={{ textDecoration: 'none', flex: 1 }}>
              {({ isActive }) => (
                <BottomNavigationAction
                  label={label}
                  icon={<span style={{ fontSize: 18 }}>{icon}</span>}
                  sx={{
                    color: isActive ? 'primary.main' : 'text.disabled',
                    minWidth: 0,
                    '& .MuiBottomNavigationAction-label': { fontSize: 9 },
                  }}
                />
              )}
            </NavLink>
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  )
}
