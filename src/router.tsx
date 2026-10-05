import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import RequireAuth from './components/RequireAuth'
import RequireAdmin from './components/RequireAdmin'

// Eager: tiny, needed for first paint on the auth flow
import LoginPage from './pages/LoginPage'

// Lazy: split large/route-specific bundles out of the initial download
const Layout    = lazy(() => import('./components/Layout'))
const TodosPage = lazy(() => import('./pages/TodosPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))

function PageFallback() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <CircularProgress size={28} />
    </Box>
  )
}

function lazyRoute(node: React.ReactNode) {
  return <Suspense fallback={<PageFallback />}>{node}</Suspense>
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  // /signup intentionally removed — new accounts must be created via Firebase console
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: lazyRoute(<Layout />),
        children: [
          { index: true, element: <Navigate to="/todos" replace /> },
          { path: 'todos', element: lazyRoute(<TodosPage />) },
          {
            path: 'admin',
            element: <RequireAdmin />,
            children: [{ index: true, element: lazyRoute(<AdminPage />) }],
          },
        ],
      },
    ],
  },
])
