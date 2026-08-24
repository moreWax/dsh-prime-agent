/**
 * @deepseek-ai/dsh-prime-harness
 *
 * Bridges Prime Agent's continual harness into DeepSeek Harness, entirely as
 * plugins on native seams:
 *
 *  - ctx.skills.registerProvider → prime skills + OKF pages in the catalog
 *  - agent/pre-step → durable memory injection (session-reference contract)
 *  - agent/turn-stopping → turn export via ctx.storageDomain / JSONL inbox
 */
import type { Context } from '@deepseek-ai/cordis'
import { Config, normalize, type PrimeHarnessConfig } from './config.js'
import { registerSkillProvider } from './skill-provider.js'
import { registerContextInjection, registerContextInjectionWith, getRenderedMemory, getInjectionError, PRIME_MEMORY_BUDGET_EXCEEDED } from './context-inject.js'
import { registerTurnExport } from './export.js'

export const name = 'prime-harness'
export const inject = ['skills'] as const
export { Config, PRIME_MEMORY_BUDGET_EXCEEDED, getRenderedMemory, getInjectionError }
export type { PrimeHarnessConfig }

export interface PluginConfig extends PrimeHarnessConfig {
  /** Prime session id whose harness state should be surfaced. */
  sessionId?: string
}

export function apply(ctx: Context, config: PluginConfig = {}): void {
  const cfg = normalize(config)

  if (cfg.serveSkills && cfg.primeHome) {
    registerSkillProvider(ctx, cfg)
  }
  if (config.sessionId && cfg.injectMemory) {
    registerContextInjection(ctx, { ...cfg, sessionId: config.sessionId })
  }
  if (config.sessionId && cfg.exportTurns) {
    registerTurnExport(ctx, { ...cfg, sessionId: config.sessionId })
  }
}

export { registerSkillProvider, registerContextInjection, registerContextInjectionWith, registerTurnExport }
export * from './store.js'
