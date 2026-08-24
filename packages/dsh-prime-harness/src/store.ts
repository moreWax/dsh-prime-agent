/**
 * Read access to Prime Agent continual-harness state and the OKF bundle.
 *
 * Everything is read-only here; the only writes this package performs are
 * append-only transcript exports to prime's inbox (see export.ts).
 */
import { readFile, readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

export interface HarnessEntry {
  kind: 'memory' | 'prompt' | 'skill'
  name: string
  body: string
}

const DEFAULT_PRIME_HOME = join(homedir(), '.prime', 'agent')

export function primeHome(cfg?: { primeHome?: string }): string {
  return cfg?.primeHome
    ? resolve(cfg.primeHome)
    : process.env.PRIME_HOME ?? DEFAULT_PRIME_HOME
}

/** Load prime's global skill files (~/.prime/agent/skills/<name>/SKILL.md). */
export async function listPrimeSkills(cfg?: { primeHome?: string }) {
  const dir = join(primeHome(cfg), 'skills')
  const out: { name: string; path: string }[] = []
  try {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const p = join(dir, entry.name, 'SKILL.md')
      out.push({ name: entry.name, path: p })
    }
  } catch { /* no prime home — empty catalog */ }
  return out
}

/**
 * Load harness entries from a prime session's kernel-state.json.
 * Tolerant of schema drift: reads only well-known shapes.
 */
export async function loadHarnessEntries(
  sessionId: string,
  cfg?: { primeHome?: string },
): Promise<HarnessEntry[]> {
  const p = join(primeHome(cfg), 'session-artifacts', sessionId, 'kernel-state.json')
  let raw: unknown
  try {
    raw = JSON.parse(await readFile(p, 'utf8'))
  } catch { return [] }
  const entries: HarnessEntry[] = []
  const isEntry = (v: unknown): v is { name: unknown; body: unknown } =>
    typeof v === 'object' && v !== null && 'name' in v && 'body' in v
  if (typeof raw === 'object' && raw !== null && Array.isArray((raw as { memories?: unknown }).memories)) {
    for (const m of (raw as { memories: unknown[] }).memories) {
      if (isEntry(m) && typeof m.name === 'string' && typeof m.body === 'string') {
        entries.push({ kind: 'memory', name: m.name, body: m.body })
      }
    }
  }
  if (typeof raw === 'object' && raw !== null && Array.isArray((raw as { prompt_notes?: unknown }).prompt_notes)) {
    for (const n of (raw as { prompt_notes: unknown[] }).prompt_notes) {
      if (isEntry(n) && typeof n.body === 'string') {
        entries.push({
          kind: 'prompt',
          name: typeof n.name === 'string' ? n.name : 'note',
          body: n.body,
        })
      }
    }
  }
  return entries
}

