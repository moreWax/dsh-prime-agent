// oxlint-disable typescript/no-unsafe-member-access -- fixtures expose recording doubles
import type { Context } from '@deepseek-ai/cordis'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { registerTurnExport } from '@morewax/dsh-prime-memory'
import { makePrimeHome, mountPrimeHarnessTestServices } from '../src/fixtures.js'

async function waitFor(check: () => boolean, ms = 1000): Promise<void> {
  const start = Date.now()
  while (!check() && Date.now() - start < ms) await new Promise(r => setTimeout(r, 5))
}

describe('turn export write-back', () => {
  it('prefers the storage-domain form over raw files', async () => {
    const home = await makePrimeHome()
    const { ctx, services } = mountPrimeHarnessTestServices()
    registerTurnExport(ctx, { primeHome: home.root, sessionId: home.sessionId })

    ctx.events.emit('agent/turn-stopping', {})
    await waitFor(() => services.storagePuts.length >= 1)
    ctx.events.emit('agent/turn-stopping', {})
    await waitFor(() => services.storagePuts.length >= 2)

    expect(services.storagePuts).toHaveLength(2)
    const first = services.storagePuts[0]!
    const second = services.storagePuts[1]!
    expect(first.domain).toBe('prime-turn-export')
    const rec = second.record as { turnSeq: number; sessionId: string }
    expect(rec.turnSeq).toBe(2)
    expect(rec.sessionId).toBe(home.sessionId)
  })

  it('falls back to append-only JSONL without storageDomain; never rejects on missing surface', async () => {
    const home = await makePrimeHome()
    // minimal context double without storageDomain; exercises the JSONL fallback path
    const handlers: Array<() => Promise<void>> = []
    const ctx = {
      events: { on(_name: string, fn: () => Promise<void>) { handlers.push(fn) } },
    } as unknown as Context
    registerTurnExport(ctx, { primeHome: home.root, sessionId: home.sessionId })

    // no sessions service — must not reject
    await expect(handlers[0]!()).resolves.toBeUndefined()

    // with a surface present, records land in inbox JSONL
    ;(ctx as unknown as { sessions: unknown }).sessions = {
      get: () => ({ surface: [{ type: 'user/message', text: 'hi' }] }),
    }
    await handlers[0]!()
    const raw = await readFile(join(home.root, 'inbox', `${home.sessionId}.jsonl`), 'utf8')
    const lines = raw.trim().split('\n')
    const rec = JSON.parse(lines.at(-1)!) as { userText?: string }
    expect(rec.userText).toBe('hi')
    for (const line of lines) expect(() => JSON.parse(line) as unknown).not.toThrow()
  })
})
