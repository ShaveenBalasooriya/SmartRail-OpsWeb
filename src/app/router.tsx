import { createBrowserRouter } from 'react-router'
import AuthCallbackPage from '@/features/auth/pages/AuthCallbackPage'
import LoginPage from '@/features/auth/pages/LoginPage'
import AuditPage from '@/features/audit/pages/AuditPage'
import AuditEntryDetailPage from '@/features/audit/pages/AuditEntryDetailPage'
import JourneyDetailPage from '@/features/journeys/pages/JourneyDetailPage'
import LiveBoardPage from '@/features/journeys/pages/LiveBoardPage'
import MapPage from '@/features/network-map/pages/MapPage'
import PublishCancellationPage from '@/features/publishing/pages/PublishCancellationPage'
import PublishCorrectionPage from '@/features/publishing/pages/PublishCorrectionPage'
import PublishDelayPage from '@/features/publishing/pages/PublishDelayPage'
import PublishPlatformChangePage from '@/features/publishing/pages/PublishPlatformChangePage'
import PublishTerminationPage from '@/features/publishing/pages/PublishTerminationPage'
import PublishedChangePage from '@/features/publishing/pages/PublishedChangePage'
import AppLayout from './layout/AppLayout'
import NoAccessPage from './pages/NoAccessPage'
import NotFoundPage from './pages/NotFoundPage'
import RoleHome from './pages/RoleHome'
import RouteErrorPage from './pages/RouteErrorPage'
import RequireAuth from './routing/RequireAuth'
import RequireRole from './routing/RequireRole'

// Layout is a route, not a wrapper inside pages. Guards are pathless layout routes that render an
// Outlet on success. Role segmentation happens at the route-group level, not per page. The signed-in
// landing page is RoleHome, which sends each role to the page it can actually open.
//
// A data router (createBrowserRouter) is required for errorElement; the pathless root carries it so
// one boundary covers render errors in every route. The callback and no-access pages sit outside
// RequireAuth: the first runs before a session exists, the second is for a signed-in person whose
// role has no page here.
//
// The publish panels are child routes of the journey detail, so their URLs stay deep-linkable while
// the detail stays mounted behind them. The published confirmation is a page of its own.
export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/auth/callback', element: <AuthCallbackPage /> },
      { path: '/no-access', element: <NoAccessPage /> },
      {
        element: <RequireAuth />,
        children: [
          // Above the layout: the landing page only redirects, so it has no chrome of its own.
          { path: '/', element: <RoleHome /> },
          {
            element: <AppLayout />,
            children: [
              { path: '/board', element: <LiveBoardPage /> },
              {
                path: '/journeys/:journeyId',
                element: <JourneyDetailPage />,
                children: [
                  {
                    element: <RequireRole allowedRoles={['network_controller']} />,
                    children: [
                      { path: 'publish/delay', element: <PublishDelayPage /> },
                      { path: 'publish/cancellation', element: <PublishCancellationPage /> },
                      { path: 'publish/platform-change', element: <PublishPlatformChangePage /> },
                      { path: 'publish/termination', element: <PublishTerminationPage /> },
                      { path: 'publish/correction', element: <PublishCorrectionPage /> },
                    ],
                  },
                ],
              },
              {
                element: <RequireRole allowedRoles={['network_controller']} />,
                children: [
                  { path: '/map', element: <MapPage /> },
                  { path: '/journeys/:journeyId/published/:changeId', element: <PublishedChangePage /> },
                ],
              },
              {
                element: <RequireRole allowedRoles={['auditor']} />,
                children: [
                  { path: '/audit', element: <AuditPage /> },
                  { path: '/audit/:entryId', element: <AuditEntryDetailPage /> },
                ],
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
