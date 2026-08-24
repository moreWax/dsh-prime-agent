import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { AgentRecord } from './types.js'

const registries = new Map<string, Record<string, AgentRecord>>()

function load(stateFile: string): Record<string, AgentRecord> {
  const existing = registries.get(stateFile)
  if (existing) return existing
  const reg: Record<string, AgentRecord> = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : {}
  registries.set(stateFile, reg)
  return reg
}

export function saveAgent(stateFile: string, rec: AgentRecord): void {
  const reg = load(stateFile)
  reg[rec.name] = rec
  mkdirSync(dirname(stateFile), { recursive: true })
  writeFileSync(stateFile, JSON.stringify(reg, null, 2))
}

export function getAgent(stateFile: string, name: string): AgentRecord | undefined {
  return load(stateFile)[name]
}

export function listAgents(stateFile: string): AgentRecord[] {
  return Object.values(load(stateFile))
}
