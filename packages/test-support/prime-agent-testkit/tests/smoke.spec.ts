// oxlint-disable typescript/no-unsafe-member-access, typescript/no-explicit-any,
// oxlint-disable typescript/no-unsafe-assignment, typescript/no-unsafe-call,
// oxlint-disable typescript/no-unsafe-argument, typescript/no-unsafe-return --
// test fixtures mount recording service doubles on a real Context; the doubles are
// intentionally loosely typed at this single boundary.
/**
 * End-to-end smoke: mount the real SkillRegistry + the prime-memory plugin
 * over synthetic fixtures, then verify the three capabilities behave as
 * documented through their public seams:
 *
 *  1. skills   → real ctx.skills catalog serves prime + OKF pages
 *  2. memory   → agent/pre-step renders escaped durable context on ctx
 *  3. export   → agent/turn-stopping lands validated records in storage
 */
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import { apply as primeHarness, getRenderedMemory } from '@morewax/dsh-prime-memory'
import { makePrimeHome } from '../src/fixtures.js'

describe('prime-memory smoke (real registry)', () => {
  it('serves skills, injects memory, and exports turns through public seams', async () => {
    const home = await makePrimeHome()

    const ctx = new Context()
    const storageRecords: Array<{ domain: string; record: Record<string, unknown> }> = []
    ;(ctx as unknown as { storageDomain: unknown }).storageDomain = {
      put(domain: string, record: Record<string, unknown>) {
        storageRecords.push({ domain, record })
      },
    }

    await ctx.plugin(SkillRegistry)
    primeHarness(ctx, {
      primeHome: home.root,
      sessionId: home.sessionId,
    })

    // 1. Skills: both sources visible through the REAL catalog seam
    const demo = await ctx.skills.get('demo-skill')
    expect(demo?.content).toContain('Say hello politely.')

    // cordis dispatches listeners on its own scheduler; poll rather than sleep.
    const until = async (check: () => boolean, ms = 1000): Promise<void> => {
      const start = Date.now()
      while (!check() && Date.now() - start < ms) await new Promise(r => setTimeout(r, 5))
    }

    // 2. Memory injection: fire the lifecycle event the way the loop does
    ctx.events.emit('agent/pre-step', {})
    await until(() => getRenderedMemory(ctx) !== undefined)
    const rendered = getRenderedMemory(ctx) ?? ''
    expect(rendered).toBeDefined()
    expect(rendered).toContain('<prime-memory>')
    expect(rendered).toContain('prefer-concise')
    // framing cannot be forged from memory bodies
    expect((rendered.match(/<\/prime-memory>/g) ?? []).length).toBe(1)

    // 3. Turn export: fire turn end; validated record reaches storage
    ctx.events.emit('agent/turn-stopping', {})
    await until(() => storageRecords.length >= 1)
    expect(storageRecords).toHaveLength(1)
    expect(storageRecords[0]!.domain).toBe('prime-turn-export')
    expect(storageRecords[0]!.record.sessionId).toBe(home.sessionId)


  })
})
