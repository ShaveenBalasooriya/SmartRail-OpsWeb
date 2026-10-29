import { matchRoutes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { router } from './router'

// The publish panels are child routes of the journey detail, so the detail stays mounted behind them. The
// published confirmation is a sibling page. Both are settled by route ranking, which this pins down: a
// later edit that flattens the layout would silently turn the confirmation into a panel over the detail.
function leafPath(path: string): string | undefined {
  return matchRoutes(router.routes, path)?.at(-1)?.route.path
}

describe('router', () => {
  it.each([
    'publish/delay',
    'publish/cancellation',
    'publish/platform-change',
    'publish/termination',
    'publish/correction',
  ])('mounts %s as a child of the journey detail', (child) => {
    const matches = matchRoutes(router.routes, `/journeys/j-1/${child}`)
    const paths = matches?.map((match) => match.route.path)

    expect(paths).toContain('/journeys/:journeyId')
    expect(leafPath(`/journeys/j-1/${child}`)).toBe(child)
  })

  it('matches the published confirmation as a page of its own, not as a panel', () => {
    expect(leafPath('/journeys/j-1/published/c-1')).toBe('/journeys/:journeyId/published/:changeId')
  })

  it('still matches the journey detail on its own', () => {
    expect(leafPath('/journeys/j-1')).toBe('/journeys/:journeyId')
  })

  // The landing page must stay beneath RequireAuth (a second pathless route), so the guard's no-access
  // and sign-in behaviour still covers it; RoleHome itself only chooses between the board and the audit log.
  it('matches the role landing page at the root, beneath the sign-in guard', () => {
    const paths = matchRoutes(router.routes, '/')?.map((match) => match.route.path)

    expect(paths).toEqual([undefined, undefined, '/'])
  })
})
