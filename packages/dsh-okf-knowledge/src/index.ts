/** OKF/OpenWiki pages exposed through the dsh skill catalog. */
import { readFile } from 'node:fs/promises'
import type { Context } from '@deepseek-ai/cordis'
import type { SkillCandidate } from '@deepseek-ai/dsh-skill'
import { firstHeading, parseFrontmatter } from './markdown.js'
import { OkfPageRepository } from './repository.js'

export interface Config {
  /** OKF/OpenWiki bundle roots; multiple bundles merge (first wins name conflicts). */
  bundles: string[]
  /** Catalog rank; lower ranks win name collisions against other providers. */
  rank?: number
  /** Serve only pages whose frontmatter status is verified. Default false. */
  verifiedOnly?: boolean
}

export const name = 'okf-knowledge'
export const inject = ['skills'] as const

export function apply(ctx: Context, config: Config): void {
  const rank = config.rank ?? 550
  const verifiedOnly = config.verifiedOnly ?? false
  const pages = new OkfPageRepository()

  ctx.skills.registerProvider(() => ({
    name,
    async list() {
      const seen = new Set<string>()
      const candidates: SkillCandidate[] = []
      for (const root of config.bundles) {
        for (const page of await pages.collect(root)) {
          if (seen.has(page.name) || (verifiedOnly && !page.verified)) continue
          seen.add(page.name)
          candidates.push({
            name: page.name,
            description: page.verified ? page.description : `${page.description} (unverified)`,
            locator: page.path, path: page.path, rank, source: 'custom', provider: name,
            invocation: { modelInvocable: true, userInvocable: true },
          })
        }
      }
      return candidates
    },
    async get(candidate) {
      const raw = await readFile(candidate.locator as string, 'utf8').catch(() => undefined)
      if (raw === undefined) return undefined
      const { body, meta } = parseFrontmatter(raw)
      return {
        name: candidate.name,
        description: meta.description || firstHeading(body),
        content: body,
        invocation: { modelInvocable: true, userInvocable: true },
        source: 'custom', provider: name,
        metadata: { okfKind: meta.kind, okfStatus: meta.status ?? 'unverified' },
      }
    },
  }))
}
