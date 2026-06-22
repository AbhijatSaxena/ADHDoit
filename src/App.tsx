import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { ConfirmProvider } from './components/ConfirmDialog'

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <ConfirmProvider />
    </>
  )
}
