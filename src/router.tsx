import { createBrowserRouter, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import TodosPage from './pages/TodosPage'
import AdminPage from './pages/AdminPage'

export const router = createBrowserRouter([
  { path: '/login',  element: <LoginPage /> },
  { path: '/signup', element: <SignUpPage /> },
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <Layout />,
        children: [
          { index: true, element: <Navigate to="/todos" replace /> },
          { path: 'todos', element: <TodosPage /> },
          { path: 'admin', element: <AdminPage /> },
        ],
      },
    ],
  },
])
