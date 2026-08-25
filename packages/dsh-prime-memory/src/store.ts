/** Read-only access to Prime Agent continual-harness state and skill catalog. */
import { readFile, readdir } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

export interface HarnessEntry {
  kind: 'memory' | 'prompt' | 'skill'
  name: string
  body: string
}

export interface PrimeStoreIO {
  readFile(path: string, encoding: 'utf8'): Promise<string>
  readdir(path: string, options: { withFileTypes: true }): Promise<Dirent[]>
}

const DEFAULT_PRIME_HOME = join(homedir(), '.prime', 'agent')
const nodeIO: PrimeStoreIO = { readFile, readdir }

export function primeHome(cfg?: { primeHome?: string }): string {
  return cfg?.primeHome ? resolve(cfg.primeHome) : process.env.PRIME_HOME ?? DEFAULT_PRIME_HOME
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseEntries(raw: unknown): HarnessEntry[] {
  if (!isRecord(raw)) return []
  const entries: HarnessEntry[] = []
  const append = (values: unknown, kind: HarnessEntry['kind'], fallbackName?: string): void => {
    if (!Array.isArray(values)) return
    for (const value of values) {
      if (!isRecord(value) || typeof value.body !== 'string') continue
      const name = typeof value.name === 'string' ? value.name : fallbackName
      if (name !== undefined) entries.push({ kind, name, body: value.body })
    }
  }
  append(raw.memories, 'memory')
  append(raw.prompt_notes, 'prompt', 'note')
  return entries
}

/** Stateful path/IO boundary for one Prime home; injectable for unit tests. */
export class PrimeHarnessStore {
  readonly root: string
  constructor(cfg?: { primeHome?: string }, private readonly io: PrimeStoreIO = nodeIO) {
    this.root = primeHome(cfg)
  }

  async listSkills(): Promise<{ name: string; path: string }[]> {
    const dir = join(this.root, 'skills')
    try {
      const items = await this.io.readdir(dir, { withFileTypes: true })
      return items.filter(item => item.isDirectory()).map(item => ({
        name: item.name,
        path: join(dir, item.name, 'SKILL.md'),
      }))
    } catch { return [] }
  }

  async loadEntries(sessionId: string): Promise<HarnessEntry[]> {
    const path = join(this.root, 'session-artifacts', sessionId, 'kernel-state.json')
    try { return parseEntries(JSON.parse(await this.io.readFile(path, 'utf8')) as unknown) }
    catch { return [] }
  }
}

/** Load prime's global skill files (~/.prime/agent/skills/<name>/SKILL.md). */
export async function listPrimeSkills(cfg?: { primeHome?: string }) {
  return new PrimeHarnessStore(cfg).listSkills()
}

/** Load well-known entries from a session's kernel-state.json, tolerating drift. */
export async function loadHarnessEntries(sessionId: string, cfg?: { primeHome?: string }): Promise<HarnessEntry[]> {
  return new PrimeHarnessStore(cfg).loadEntries(sessionId)
}
