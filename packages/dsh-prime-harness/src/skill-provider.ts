/**
 * ctx.skills provider serving Prime Agent skills and OKF bundle pages into
 * dsh's model-facing skill catalog via the real registerProvider seam.
 */
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type {
  SkillCandidate,
  SkillDefinition,
  SkillInvocationPolicy,
  SkillLookupOptions,
} from '@deepseek-ai/dsh-skill'
import { listPrimeSkills } from './store.js'

interface SourceSkill { name: string; path: string }

/** Tolerant sync read used during catalog discovery. */
const readSync = (p: string): string => readFileSync(p, 'utf8')

/** Parse frontmatter-ish description from a markdown page; tolerant fallback. */
function describe(body: string): string {
  const m = body.match(/^---\n([\s\S]*?)\n---/)
  if (m?.[1]) {
    const d = m[1].match(/^description:\s*(.+)$/m)
    if (d?.[1]) return d[1].trim()
  }
  return body.split('\n').find(l => l.startsWith('# '))?.replace(/^#\s*/, '') ?? ''
}

export function registerSkillProvider(
  ctx: Context,
  cfg: { rank: number; primeHome?: string },
): void {
  ctx.skills.registerProvider(() => ({
    name: 'prime-harness',
    async list(options: SkillLookupOptions): Promise<readonly SkillCandidate[]> {
      void options
      const found: SourceSkill[] = await listPrimeSkills(cfg)
      const seen = new Set<string>()
      return found.flatMap((s) => {
        const name = s.name.replace(/\.md$/, '')
        if (seen.has(name)) return []
        seen.add(name)
        let body = ''
        try { body = readSync(s.path) } catch { return [] }
        return [{
          name,
          description: describe(body),
          locator: s.path,
          path: s.path,
          rank: cfg.rank,
          source: 'custom',
          provider: 'prime-harness',
          invocation: { modelInvocable: true, userInvocable: true },
        }]
      })
    },
    async get(candidate: SkillCandidate, options: SkillLookupOptions): Promise<SkillDefinition | undefined> {
      void options
      const path = candidate.locator as string
      try {
        const raw = await readFile(path, 'utf8')
        // strip frontmatter for content
        const content = raw.replace(/^---\n[\s\S]*?\n---\n?/, '')
        const invocation: SkillInvocationPolicy = { modelInvocable: true, userInvocable: true }
        return {
          name: candidate.name,
          description: describe(raw),
          invocation,
          source: 'custom' as never,
          provider: 'prime-harness',
          content,
          path,
        }
      } catch {
        return undefined
      }
    },
  }))
}
void basename
