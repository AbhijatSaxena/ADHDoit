import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Box, CircularProgress } from '@mui/material'

export default function RequireAdmin() {
  const { user, role, authLoading } = useAuthStore()

  if (authLoading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  if (!user || role !== 'admin') return <Navigate to="/todos" replace />

  return <Outlet />
}
