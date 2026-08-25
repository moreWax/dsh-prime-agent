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

/** Owns sequence state and the storage lifecycle for a single session. */
class TurnExporter {
  private sequence = 0
  private readonly inbox: string
  private readonly file: string

  constructor(private readonly view: ExportContextView, private readonly cfg: PrimeHarnessConfig & { sessionId: string }) {
    this.inbox = join(primeHome(cfg), 'inbox')
    this.file = join(this.inbox, `${cfg.sessionId}.jsonl`)
  }

  async export(): Promise<void> {
    const surface = this.view.sessions?.get?.()?.surface ?? []
    const userText = textOf(surface, 'user/message')
    const assistantText = textOf(surface, 'assistant/message')
    const toolCalls = toolSummaries(surface)
    const record: TurnExportRecord = {
      ts: new Date().toISOString(), sessionId: this.cfg.sessionId, turnSeq: ++this.sequence,
      ...(userText === undefined ? {} : { userText }),
      ...(assistantText === undefined ? {} : { assistantText }),
      ...(toolCalls.length === 0 ? {} : { toolCalls }),
    }
    validate(record)
    if (this.view.storageDomain?.put) return this.view.storageDomain.put(DOMAIN, record)
    await mkdir(this.inbox, { recursive: true })
    await appendFile(this.file, JSON.stringify(record) + '\n', 'utf8')
  }
}

export function registerTurnExport(ctx: Context, cfg: PrimeHarnessConfig & { sessionId: string }): void {
  if (cfg.exportTurns === false) return
  const exporter = new TurnExporter(ctx as unknown as ExportContextView, cfg)
  ctx.events.on('agent/turn-stopping', async () => {
    try { await exporter.export() }
    catch { /* export must never break the agent loop */ }
  })
}
