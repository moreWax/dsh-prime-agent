// oxlint-disable typescript/no-unsafe-member-access, typescript/no-explicit-any,
// oxlint-disable typescript/no-unsafe-assignment, typescript/no-unsafe-call,
// oxlint-disable typescript/no-unsafe-argument, typescript/no-unsafe-return --
// test fixtures mount recording service doubles on a real Context; the doubles are
// intentionally loosely typed at this single boundary.
import { describe, expect, it } from 'vitest'
import { registerSkillProvider } from '@morewax/dsh-prime-harness'
import { makePrimeHome, mountPrimeHarnessTestServices } from '../src/fixtures.js'

describe('skill provider wiring (real Context)', () => {
  it('registers one provider serving both sources; loads bodies via get()', async () => {
    const home = await makePrimeHome()
    const { ctx, services } = mountPrimeHarnessTestServices()

    registerSkillProvider(ctx, { rank: 600, primeHome: home.root })

    expect(services.providers).toHaveLength(1)
    const provider = services.providers[0] as any
    const listed = await provider.list({})
    // prime-only now: OKF/OpenWiki serving lives in @deepseek-ai/dsh-okf-openwiki
    const names = listed.map((s: { name: string }) => s.name)
    expect(names).toContain('demo-skill')
    expect(names).not.toContain('okf-routing')

    const candidate = listed.find((s: { name: string }) => s.name === 'demo-skill')
    const def = await provider.get(candidate, {})
    expect(def?.content).toContain('Say hello politely.')
    expect(await provider.get({ ...candidate, locator: '/nonexistent/path/x' }, {})).toBeUndefined()
  })
})
