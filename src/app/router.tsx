import { createBrowserRouter, Navigate } from 'react-router'
import LoginPage from '@/features/auth/pages/LoginPage'
import AuditPage from '@/features/audit/pages/AuditPage'
import JourneyDetailPage from '@/features/journeys/pages/JourneyDetailPage'
import LiveBoardPage from '@/features/journeys/pages/LiveBoardPage'
import PublishCancellationPage from '@/features/publishing/pages/PublishCancellationPage'
import PublishDelayPage from '@/features/publishing/pages/PublishDelayPage'
import PublishPlatformChangePage from '@/features/publishing/pages/PublishPlatformChangePage'
import AppLayout from './layout/AppLayout'
import NotFoundPage from './pages/NotFoundPage'
import RouteErrorPage from './pages/RouteErrorPage'
import RequireAuth from './routing/RequireAuth'
import RequireRole from './routing/RequireRole'

// Layout is a route, not a wrapper inside pages. Guards are pathless layout routes that render an
// Outlet on success. Role segmentation happens at the route-group level, not per page. The Live
// board is the landing page for every role, so it sits above the role groups.
//
// A data router (createBrowserRouter) is required for errorElement; the pathless root carries it so
// one boundary covers render errors in every route.
export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <Navigate to="/board" replace /> },
      { path: '/login', element: <LoginPage /> },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: '/board', element: <LiveBoardPage /> },
              { path: '/journeys/:journeyId', element: <JourneyDetailPage /> },
              {
                element: <RequireRole allowedRoles={['network_controller']} />,
                children: [
                  { path: '/journeys/:journeyId/publish/delay', element: <PublishDelayPage /> },
                  { path: '/journeys/:journeyId/publish/cancellation', element: <PublishCancellationPage /> },
                  { path: '/journeys/:journeyId/publish/platform-change', element: <PublishPlatformChangePage /> },
                ],
              },
              {
                element: <RequireRole allowedRoles={['auditor']} />,
                children: [{ path: '/audit', element: <AuditPage /> }],
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
