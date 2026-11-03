import { useAuth } from '@/app/providers/AuthContext'

// The same context the route guard reads, so the links and the guard cannot disagree about the role.
// The API still enforces the role on every write; this only decides what is offered.
export function useCanPublish(): boolean {
  return useAuth().currentUser?.role === 'network_controller'
}
