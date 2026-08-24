import z from '@deepseek-ai/schemastery'

/** Config for every plugin in the prime-harness family. */
export interface PrimeHarnessConfig {
  primeHome?: string
  rank?: number
  injectBudgetChars?: number
  serveSkills?: boolean
  injectMemory?: boolean
  exportTurns?: boolean
}

/** Schemastery schema; every field carries a default so partial config is valid. */
export const Config = z.object({
  primeHome: z.string().default(''),
  rank: z.number().default(600),
  injectBudgetChars: z.number().default(8000),
  serveSkills: z.boolean().default(true),
  injectMemory: z.boolean().default(true),
  exportTurns: z.boolean().default(true),
}).description('prime-harness bridge configuration')

export function normalize(raw: Partial<PrimeHarnessConfig> = {}): Required<PrimeHarnessConfig> {
  return {
    primeHome: raw.primeHome || '',
    rank: raw.rank ?? 600,
    injectBudgetChars: raw.injectBudgetChars ?? 8000,
    serveSkills: raw.serveSkills ?? true,
    injectMemory: raw.injectMemory ?? true,
    exportTurns: raw.exportTurns ?? true,
  }
}
