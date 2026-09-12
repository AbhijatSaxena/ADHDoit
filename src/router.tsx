import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import RequireAuth from './components/RequireAuth'

// Eager: tiny, needed for first paint on the auth flow
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'

// Lazy: split large/route-specific bundles out of the initial download
const Layout        = lazy(() => import('./components/Layout'))
const TodosPage     = lazy(() => import('./pages/TodosPage'))
const AdminPage     = lazy(() => import('./pages/AdminPage'))
const TaskHubPage   = lazy(() => import('./pages/TaskHubPage'))
const HubDetailPage = lazy(() => import('./pages/HubDetailPage'))

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
  { path: '/login',  element: <LoginPage /> },
  { path: '/signup', element: <SignUpPage /> },
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
          { path: 'hub', element: lazyRoute(<TaskHubPage />) },
          { path: 'hub/:hubId', element: lazyRoute(<HubDetailPage />) },
          { path: 'admin', element: lazyRoute(<AdminPage />) },
        ],
      },
    ],
  },
])
