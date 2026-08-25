import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { listPrimeSkills, loadHarnessEntries, primeHome } from '@morewax/dsh-prime-memory'
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

  it('resolves explicit homes and otherwise honors PRIME_HOME', () => {
    const before = process.env.PRIME_HOME
    process.env.PRIME_HOME = '/tmp/prime-from-env'
    try {
      expect(primeHome()).toBe('/tmp/prime-from-env')
      expect(primeHome({ primeHome: './relative-prime' })).toBe(resolve('./relative-prime'))
    } finally {
      if (before === undefined) delete process.env.PRIME_HOME
      else process.env.PRIME_HOME = before
    }
  })
})
