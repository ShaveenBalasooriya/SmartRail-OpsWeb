import { describe, expect, it } from 'vitest'
import { roleFromGroups } from './roleFromGroups'

describe('roleFromGroups', () => {
  it('maps a single known operations group to its role', () => {
    expect(roleFromGroups(['network_controller'])).toBe('network_controller')
    expect(roleFromGroups(['auditor'])).toBe('auditor')
  })

  it('ignores unrelated groups alongside one known role', () => {
    expect(roleFromGroups(['staff', 'auditor'])).toBe('auditor')
  })

  it('gives a guard signed-in-but-no-access, not a role', () => {
    expect(roleFromGroups(['guard'])).toBeNull()
  })

  it('gives no role for an empty claim, a missing claim or a non-array claim', () => {
    expect(roleFromGroups([])).toBeNull()
    expect(roleFromGroups(undefined)).toBeNull()
    expect(roleFromGroups('network_controller')).toBeNull()
  })

  it('gives no role when the token carries both known roles, because the API refuses that too', () => {
    expect(roleFromGroups(['network_controller', 'auditor'])).toBeNull()
  })

  it('ignores non-string entries', () => {
    expect(roleFromGroups([42, null, 'auditor'])).toBe('auditor')
  })

  it('does not match a role name by prefix or case', () => {
    expect(roleFromGroups(['auditor.something'])).toBeNull()
    expect(roleFromGroups(['AUDITOR'])).toBeNull()
  })
})
