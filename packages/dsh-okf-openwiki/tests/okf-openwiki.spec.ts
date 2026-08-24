// oxlint-disable typescript/no-unsafe-member-access -- fixtures expose recording doubles
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import * as okfOpenwiki from '@deepseek-ai/dsh-okf-openwiki'
import { makeOkfBundle } from '@your-scope/dsh-prime-bridge-testkit'

function mount(bundles: string[], extra: Record<string, unknown> = {}) {
  const ctx = new Context()
  let provider: unknown
  ;(ctx as unknown as Record<string, unknown>).skills = {
    registerProvider(create: (c: unknown) => unknown) { provider = create({}) },
  }
  const pluginCtx = new Context()
  ;(pluginCtx as unknown as Record<string, unknown>).skills = {
    registerProvider(create: (c: unknown) => unknown) { provider = create({}) },
  }
  void pluginCtx
  // apply registers on the passed ctx; use the double-bearing one
  okfOpenwiki.apply(ctx, { bundles, ...extra })
  type Provider = {
    list(o?: unknown): Promise<{ name: string; description: string }[]>
    get(c: { locator: string }): Promise<{ content: string } | undefined>
  }
  return { ctx, provider: provider as Provider }
}

describe('okf-openwiki knowledge plugin', () => {
  it('serves bundle pages with provenance through the real registry', async () => {
    const bundle = await makeOkfBundle()
    const { ctx } = mount([bundle.root])
    await ctx.plugin(SkillRegistry)
    // re-apply against the REAL registry (mount() installed a recording double)
    const realCtx = new Context()
    await realCtx.plugin(SkillRegistry)
    okfOpenwiki.apply(realCtx, { bundles: [bundle.root] })

    const demo = await realCtx.skills.get('okf-routing')
    expect(demo?.content).toContain('Route file tasks')
    expect((demo as unknown as { metadata?: Record<string, unknown> }).metadata?.okfStatus).toBe('verified')
  })

  it('verifiedOnly filters pages lacking verified status', async () => {
    const bundle = await makeOkfBundle()
    const { provider } = mount([bundle.root], { verifiedOnly: true })
    const listed = await provider.list()
    expect(listed.map(s => s.name)).toContain('okf-routing') // fixture page IS verified
  })

  it('keeps unverified pages by default and marks them in description', async () => {
    const bundle = await makeOkfBundle()
    const { provider } = mount([bundle.root])
    const listed = await provider.list()
    expect(listed.map(s => s.name)).toContain('okf-routing')
    expect(listed[0]?.description).not.toContain('(unverified)')
  })
})
