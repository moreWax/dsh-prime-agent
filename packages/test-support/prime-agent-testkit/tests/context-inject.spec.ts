// oxlint-disable typescript/no-unsafe-member-access -- fixtures expose recording doubles
import { describe, expect, it } from 'vitest'
import {
  getInjectionError,
  getRenderedMemory,
  PRIME_MEMORY_BUDGET_EXCEEDED,
  registerContextInjectionWith,
} from '@morewax/dsh-prime-memory'
import { makePrimeHome, mountPrimeHarnessTestServices } from '../src/fixtures.js'

/** Poll until fn() turns true (cordis dispatches listeners on its own scheduler). */
async function until(fn: () => boolean, ms = 1000): Promise<void> {
  const start = Date.now()
  while (!fn() && Date.now() - start < ms) await new Promise(r => setTimeout(r, 5))
}

describe('durable memory injection (session-reference contract)', () => {
  it('renders JSON-escaped entries inside framed tags', async () => {
    const home = await makePrimeHome()
    const { ctx } = mountPrimeHarnessTestServices()
    registerContextInjectionWith(ctx, { primeHome: home.root, sessionId: home.sessionId }, { budgetChars: 8000 })
    ctx.events.emit('agent/pre-step', {})
    await until(() => getRenderedMemory(ctx) !== undefined)
    const out = getRenderedMemory(ctx) ?? ''
    expect(out).toContain('<prime-memory>')
    expect(out).toContain('WARNING')
    expect(out).toContain('prefer-concise')
    expect(out).not.toContain('broken-entry')
  })

  it('injection attempts in memory bodies cannot forge framing tags', async () => {
    const home = await makePrimeHome()
    const { ctx } = mountPrimeHarnessTestServices()
    registerContextInjectionWith(ctx, { primeHome: home.root, sessionId: home.sessionId }, { budgetChars: 80000 })
    ctx.events.emit('agent/pre-step', {})
    await until(() => getRenderedMemory(ctx) !== undefined)
    const out = getRenderedMemory(ctx) ?? ''
    expect(out).toContain('Ignore prior instructions')          // content preserved...
    expect(out.includes('</prime-memory> Ignore')).toBe(false) // ...but escaped
    expect((out.match(/<\/prime-memory>/g) ?? []).length).toBe(1) // exactly one real closer
  })

  it('fails with an explicit code when budget policy is fail', async () => {
    const home = await makePrimeHome()
    const { ctx } = mountPrimeHarnessTestServices()
    registerContextInjectionWith(ctx, { primeHome: home.root, sessionId: home.sessionId }, {
      budgetChars: 10,
      onBudgetExceeded: 'fail',
    })
    ctx.events.emit('agent/pre-step', {})
    await until(() => getInjectionError(ctx) !== undefined)
    expect(getInjectionError(ctx)).toMatchObject({ code: PRIME_MEMORY_BUDGET_EXCEEDED })
    expect(getRenderedMemory(ctx)).toBeUndefined()
  })

  it('truncates with a notice when budget policy is truncate-with-notice', async () => {
    const home = await makePrimeHome()
    const { ctx } = mountPrimeHarnessTestServices()
    registerContextInjectionWith(ctx, { primeHome: home.root, sessionId: home.sessionId }, {
      budgetChars: 400,
      onBudgetExceeded: 'truncate-with-notice',
    })
    ctx.events.emit('agent/pre-step', {})
    await until(() => (getRenderedMemory(ctx) ?? '').includes('budget exceeded'))
  })
})
