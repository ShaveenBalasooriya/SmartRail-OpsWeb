import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { queryClient } from '@/app/queryClient'
import { router } from '@/app/router'
import AuthProvider from '@/app/providers/AuthProvider'

// Provider composition only. Routing and the guards that depend on identity live in app/.
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
