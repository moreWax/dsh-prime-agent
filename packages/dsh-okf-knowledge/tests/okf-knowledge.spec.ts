// oxlint-disable typescript/no-unsafe-member-access -- fixtures expose recording doubles
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import * as okfOpenwiki from '../src/index.js'
import { makeOkfBundle } from '@morewax/dsh-prime-agent-testkit'

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

describe('okf-knowledge knowledge plugin', () => {
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
  it('keeps first-bundle precedence for duplicate page names', async () => {
    const first = await makeOkfBundle()
    const second = await makeOkfBundle()
    await writeFile(join(second.root, 'skills', 'okf-routing.md'),
      '---\nkind: skill\nstatus: verified\ndescription: Second copy\n---\n\n# Second\nSecond body.\n')
    const { provider } = mount([first.root, second.root])
    const listed = await provider.list()
    expect(listed.filter(s => s.name === 'okf-routing')).toHaveLength(1)
    expect(listed.find(s => s.name === 'okf-routing')?.description).toBe('Demo routing knowledge')
  })

  it('ignores markdown without a declared OKF kind', async () => {
    const bundle = await makeOkfBundle()
    await writeFile(join(bundle.root, 'skills', 'readme.md'), '# Read me\nNot an OKF page.\n')
    const { provider } = mount([bundle.root])
    expect((await provider.list()).map(s => s.name)).not.toContain('readme')
  })

  it('returns undefined when a listed page disappears', async () => {
    const bundle = await makeOkfBundle()
    const { provider } = mount([bundle.root])
    const [candidate] = await provider.list() as Array<{ locator: string; name: string; description: string }>
    await rm(candidate!.locator)
    await expect(provider.get(candidate!)).resolves.toBeUndefined()
  })

})
