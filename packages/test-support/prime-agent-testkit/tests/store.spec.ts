import { describe, expect, it } from 'vitest'
import { listPrimeSkills, loadHarnessEntries } from '@morewax/dsh-prime-memory'
import { makePrimeHome } from '../src/fixtures.js'

describe('store readers', () => {
  it('discovers prime skills', async () => {
    const home = await makePrimeHome()
    const skills = await listPrimeSkills({ primeHome: home.root })
    expect(skills.map(s => s.name)).toContain('demo-skill')
  })

  it('skips malformed harness entries instead of throwing', async () => {
    const home = await makePrimeHome()
    const entries = await loadHarnessEntries(home.sessionId, { primeHome: home.root })
    const names = entries.filter(e => e.kind === 'memory').map(e => e.name)
    expect(names).toContain('prefer-concise')
    expect(names).toContain('injection-probe')
    expect(names).not.toContain('broken-entry')
  })


  it('degrades to empty for missing inputs', async () => {
    expect(await listPrimeSkills({ primeHome: '/nope' })).toEqual([])
    expect(await loadHarnessEntries('missing', { primeHome: '/nope' })).toEqual([])
  })
})
