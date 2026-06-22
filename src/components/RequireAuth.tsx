import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Box, CircularProgress } from '@mui/material'

export default function RequireAuth() {
  const { user, authLoading } = useAuthStore()

  if (authLoading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}
