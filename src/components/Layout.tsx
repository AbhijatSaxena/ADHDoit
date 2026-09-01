import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Typography, Tooltip, BottomNavigation, BottomNavigationAction, Paper,
} from '@mui/material'
import { useAuthStore } from '../store/authStore'
import { useHubStore } from '../store/hubStore'

const staticNavItems = [
  { to: '/todos', label: 'Todos', icon: '✅', adminOnly: false },
  { to: '/hub',   label: 'Task Hub', icon: '📋', adminOnly: false },
]
const adminNavItems = [
  { to: '/admin', label: 'Admin', icon: '🔐', adminOnly: true },
]

const SIDEBAR_W = 200

export default function Layout() {
  const { user, role, signOut } = useAuthStore()
  const { hubs, loadHubs } = useHubStore()

  useEffect(() => { loadHubs() }, [])

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* Sidebar (desktop) */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'flex' },
          width: SIDEBAR_W,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: SIDEBAR_W,
            boxSizing: 'border-box',
            bgcolor: '#111827',
            borderRight: '1px solid #1f2937',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Brand */}
        <Box sx={{ px: 2.5, py: 2.5, borderBottom: '1px solid #1f2937' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', letterSpacing: '-0.01em', fontSize: 15 }}>
            ADHDoit
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
            Get things done, one at a time
          </Typography>
        </Box>

        {/* Nav links */}
        <List sx={{ flex: 1, px: 1, py: 1.5, overflowY: 'auto' }} disablePadding>
          {/* Static items (Todos, Task Hub) */}
          {staticNavItems.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} end style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <ListItem disablePadding sx={{ mb: 0.25 }}>
                  <ListItemButton selected={isActive} sx={{ borderRadius: 2, py: 1, minHeight: 36, '&.Mui-selected': { bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } } }}>
                    <ListItemIcon sx={{ minWidth: 28, fontSize: 16 }}>{icon}</ListItemIcon>
                    <ListItemText primary={label} slotProps={{ primary: { style: { fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? 'white' : '#9ca3af' } } }} />
                  </ListItemButton>
                </ListItem>
              )}
            </NavLink>
          ))}

          {/* Hub sub-items */}
          {hubs.map(hub => (
            <NavLink key={hub.id} to={`/hub/${hub.id}`} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <ListItem disablePadding sx={{ mb: 0.25, pl: 1.5 }}>
                  <ListItemButton selected={isActive} sx={{ borderRadius: 2, py: 0.75, minHeight: 32, '&.Mui-selected': { bgcolor: '#1e3a5f', '&:hover': { bgcolor: '#1e3a5f' } } }}>
                    <ListItemIcon sx={{ minWidth: 22, fontSize: 11, color: isActive ? '#60a5fa' : '#6b7280' }}>▸</ListItemIcon>
                    <ListItemText primary={hub.name} slotProps={{ primary: { style: { fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? '#93c5fd' : '#6b7280' } } }} />
                  </ListItemButton>
                </ListItem>
              )}
            </NavLink>
          ))}

          {/* Admin */}
          {adminNavItems.filter(() => role === 'admin').map(({ to, label, icon }) => (
            <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <ListItem disablePadding sx={{ mb: 0.25 }}>
                  <ListItemButton selected={isActive} sx={{ borderRadius: 2, py: 1, minHeight: 36, '&.Mui-selected': { bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } } }}>
                    <ListItemIcon sx={{ minWidth: 28, fontSize: 16 }}>{icon}</ListItemIcon>
                    <ListItemText primary={label} slotProps={{ primary: { style: { fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? 'white' : '#9ca3af' } } }} />
                  </ListItemButton>
                </ListItem>
              )}
            </NavLink>
          ))}
        </List>

        {/* Footer */}
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
          {[...staticNavItems, ...(role === 'admin' ? adminNavItems : [])].map(({ to, label, icon }) => (
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
