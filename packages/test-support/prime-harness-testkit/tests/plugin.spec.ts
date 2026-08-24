// oxlint-disable typescript/no-unsafe-member-access, typescript/no-explicit-any,
// oxlint-disable typescript/no-unsafe-assignment, typescript/no-unsafe-call,
// oxlint-disable typescript/no-unsafe-argument, typescript/no-unsafe-return --
// test fixtures mount recording service doubles on a real Context; the doubles are
// intentionally loosely typed at this single boundary.
import { describe, expect, it } from 'vitest'
import { apply } from '@morewax/dsh-prime-harness'
import { makePrimeHome, mountPrimeHarnessTestServices } from '../src/fixtures.js'

describe('plugin composition gates', () => {
  it('registers skill provider when serveSkills is on', async () => {
    const home = await makePrimeHome()
    const { ctx, services } = mountPrimeHarnessTestServices()
    apply(ctx, { primeHome: home.root, serveSkills: true })
    expect(services.providers).toHaveLength(1)
  })

  it('registers nothing when all capabilities are off', async () => {
    const home = await makePrimeHome()
    const { ctx, services } = mountPrimeHarnessTestServices()
    apply(ctx, {
      primeHome: home.root, serveSkills: false,
      sessionId: home.sessionId, injectMemory: false, exportTurns: false,
    })
    expect(services.providers).toHaveLength(0)
  })
})
