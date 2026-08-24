/**
 * Turn-export write-back as a storage-domain data form.
 *
 * Records land through ctx.storageDomain (backend-agnostic: json or sqlite)
 * when that service is present, falling back to append-only JSONL under
 * <primeHome>/inbox/ otherwise. Both paths are append-only: a crash leaves a
 * short record, never corrupt state.
 */
import { appendFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { primeHome } from './store.js'
import type { PrimeHarnessConfig } from './config.js'

/** Validated domain record for one exported turn. */
export interface TurnExportRecord {
  ts: string
  sessionId: string
  turnSeq: number
  userText?: string
  assistantText?: string
  toolCalls?: { name: string; summary: string }[]
}

/** Structural views of host services this package reads; tolerant by design. */
export interface ExportSurfaceNode {
  readonly type?: unknown
  readonly text?: unknown
  readonly toolName?: unknown
  readonly name?: unknown
  readonly summary?: unknown
}

export interface ExportSessionView {
  readonly surface?: readonly ExportSurfaceNode[]
}

export interface ExportContextView {
  readonly sessions?: { readonly get?: () => ExportSessionView | undefined }
  readonly storageDomain?: {
    readonly put?: (domain: string, record: TurnExportRecord) => Promise<void>
  }
}

const DOMAIN = 'prime-turn-export'

function validate(rec: TurnExportRecord): void {
  if (typeof rec.ts !== 'string' || !rec.ts) throw new Error('turn-export: ts required')
  if (typeof rec.sessionId !== 'string' || !rec.sessionId) throw new Error('turn-export: sessionId required')
  if (!Number.isInteger(rec.turnSeq)) throw new Error('turn-export: turnSeq must be an integer')
}

function textOf(surface: readonly ExportSurfaceNode[], type: string): string | undefined {
  for (let i = surface.length - 1; i >= 0; i--) {
    const node = surface[i]
    if (node?.type === type && typeof node.text === 'string') return node.text.slice(0, 20000)
  }
  return undefined
}

function toolSummaries(surface: readonly ExportSurfaceNode[]) {
  return surface
    .filter(n => n.type === 'tool/result')
    .slice(-20)
    .map(n => ({
      name: typeof n.toolName === 'string' ? n.toolName : typeof n.name === 'string' ? n.name : 'unknown',
      summary: typeof n.summary === 'string' ? n.summary.slice(0, 500) : '',
    }))
}

export function registerTurnExport(ctx: Context, cfg: PrimeHarnessConfig & { sessionId: string }): void {
  if (cfg.exportTurns === false) return
  const inbox = join(primeHome(cfg), 'inbox')
  const file = join(inbox, `${cfg.sessionId}.jsonl`)
  let lastSeq = 0

  ctx.events.on('agent/turn-stopping', async () => {
    try {
      const view = ctx as unknown as ExportContextView
      const session = view.sessions?.get?.() ?? null
      const surface: readonly ExportSurfaceNode[] = session?.surface ?? []
      const base: TurnExportRecord = {
        ts: new Date().toISOString(),
        sessionId: cfg.sessionId,
        turnSeq: ++lastSeq,
      }
      const u = textOf(surface, 'user/message')
      const a = textOf(surface, 'assistant/message')
      const t = toolSummaries(surface)
      const record: TurnExportRecord = {
        ...base,
        ...(u === undefined ? {} : { userText: u }),
        ...(a === undefined ? {} : { assistantText: a }),
        ...(t.length > 0 ? { toolCalls: t } : {}),
      }
      validate(record)

      if (view.storageDomain?.put) {
        await view.storageDomain.put(DOMAIN, record)
        return
      }
      await mkdir(inbox, { recursive: true })
      await appendFile(file, JSON.stringify(record) + '\n', 'utf8')
    } catch {
      /* export must never break the agent loop */
    }
  })
}
