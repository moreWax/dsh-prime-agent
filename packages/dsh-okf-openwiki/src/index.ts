/**
 * OKF/OpenWiki knowledge plugin: serves an OKF bundle's pages into dsh's
 * model-facing skill catalog AS A UNIFIED KNOWLEDGE SYSTEM, with provenance
 * surfaced rather than hidden.
 *
 * Trust model (from page frontmatter): `status: verified` pages are marked;
 * unverified pages carry an explicit "(unverified)" routing hint so consumers
 * can gate on trust without parsing bodies.
 *
 * This package owns NO prime-agent concerns: pure knowledge serving.
 * Pair it with @deepseek-ai/dsh-prime-harness if you also want prime memory
 * injection and turn export.
 * @module @deepseek-ai/dsh-okf-openwiki
 */
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type {
  SkillCandidate,
} from '@deepseek-ai/dsh-skill'

export interface Config {
  /** OKF/OpenWiki bundle roots; multiple bundles merge (first wins name conflicts). */
  bundles: string[]
  /** Catalog rank; lower ranks win name collisions against other providers. */
  rank?: number
  /** Serve only pages whose frontmatter status is verified. Default false. */
  verifiedOnly?: boolean
}

interface WikiPage {
  name: string
  path: string
  description: string
  verified: boolean
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/)
  const meta: Record<string, string> = {}
  let body = raw
  if (m?.[1]) {
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^(\w[\w-]*):\s*(.+)$/)
      const key = kv?.[1]
      const value = kv?.[2]
      if (key !== undefined && value !== undefined) meta[key] = value.trim()
    }
    body = raw.slice(m[0].length)
  }
  return { meta, body }
}

async function collectPages(root: string): Promise<WikiPage[]> {
  const abs = resolve(root)
  const out: WikiPage[] = []
  const walk = async (dir: string, depth: number): Promise<void> => {
    if (depth > 5) return
    let items
    try { items = await readdir(dir, { withFileTypes: true }) } catch { return }
    for (const item of items) {
      const p = join(dir, item.name)
      if (item.isDirectory()) await walk(p, depth + 1)
      else if (/\.md$/.test(item.name) && !/\.zh\.md$/.test(item.name)) {
        const raw = await readFile(p, 'utf8').catch(() => '')
        if (!raw) continue
        const { meta } = parseFrontmatter(raw)
        // only pages that declare themselves knowledge (kind: skill|decision|...)
        if (meta.kind === undefined) continue
        const heading = raw.split('\n').find(l => l.startsWith('# '))?.replace(/^#\s*/, '') ?? ''
        out.push({
          name: item.name.replace(/\.md$/, ''),
          path: p,
          description: meta.description ?? heading,
          verified: meta.status === 'verified',
        })
      }
    }
  }
  await walk(abs, 0)
  return out
}

import { readdir } from 'node:fs/promises'

export const name = 'okf-openwiki'
export const inject = ['skills'] as const

export function apply(ctx: Context, config: Config): void {
  const rank = config.rank ?? 550
  const verifiedOnly = config.verifiedOnly ?? false

  ctx.skills.registerProvider(() => ({
    name: 'okf-openwiki',
    async list() {
      const seen = new Set<string>()
      const candidates: SkillCandidate[] = []
      for (const root of config.bundles) {
        for (const page of await collectPages(root)) {
          if (seen.has(page.name)) continue
          if (verifiedOnly && !page.verified) continue
          seen.add(page.name)
          candidates.push({
            name: page.name,
            description: page.verified ? page.description : `${page.description} (unverified)`,
            locator: page.path,
            path: page.path,
            rank,
            source: 'custom',
            provider: 'okf-openwiki',
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
        description: meta.description !== undefined && meta.description !== ''
          ? meta.description
          : body.split('\n').find(l => l.startsWith('# '))?.replace(/^#\s*/, '') ?? '',
        content: body,
        invocation: { modelInvocable: true, userInvocable: true },
        source: 'custom',
        provider: 'okf-openwiki',
        metadata: {
          okfKind: meta.kind,
          okfStatus: meta.status ?? 'unverified',
        },
      }
    },
  }))
}
