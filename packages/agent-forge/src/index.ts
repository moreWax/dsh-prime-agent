/**
 * dsh-agent-forge: per-agent GitHub identities as first-class Harness tools.
 *
 * Every agent gets its own private GitHub App, so its commits, PRs and comments
 * carry a distinct `agent-<name>[bot]` identity under the owner's org —
 * one human owner account, many machine identities, fully ToS-compliant.
 *
 * @module dsh-agent-forge
 */

import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { installationToken } from './github.js'
import { ensureListener, provisionUrl } from './provision.js'
import { getAgent, listAgents, saveAgent } from './store.js'
import type { AgentRecord, ForgeConfig } from './types.js'

export const name = 'agent-forge'
export const inject = ['tools']

export interface Config {
  /** Where the agent registry is persisted. */
  stateFile?: string
  /** Root for per-agent workspaces. */
  workspaceRoot?: string
  /** Port for the one-time provisioning callback listener. */
  callbackPort?: number
  /** Base URL GitHub redirects to after approval; must be reachable by github.com. */
  publicUrl?: string
  /** Org to auto-install new agent apps into. */
  org?: string
}

export const Config: Schema<Config> = Schema.object({
  stateFile: Schema.string().default('$DSH_HOME/agents.json'),
  workspaceRoot: Schema.string().default('~/agents'),
  callbackPort: Schema.number().default(8765),
  publicUrl: Schema.string(),
  org: Schema.string(),
})

const NAME_PATTERN = /^[a-z0-9-]{3,30}$/

function resolveStateFile(stateFile?: string): string {
  const home = process.env.DSH_HOME ?? `${process.env.HOME}/.dsh`
  return (stateFile ?? '$DSH_HOME/agents.json').replace('$DSH_HOME', home)
}

export function apply(ctx: Context, config: Config = {}): void {
  const forge: ForgeConfig = {
    ...config,
    stateFile: resolveStateFile(config.stateFile),
    workspaceRoot: config.workspaceRoot ?? '~/agents',
    callbackPort: config.callbackPort ?? 8765,
  }

  const summary = (rec: AgentRecord) => ({
    name: rec.name,
    identity: rec.slug ? `${rec.slug}[bot]` : undefined,
    status: rec.status,
    installationId: rec.installationId,
    createdAt: rec.createdAt,
  })

  ctx.tools.register(defineTool({
    name: 'forge_list_agents',
    description: 'List all agent identities managed by agent-forge, with their GitHub bot identity and status.',
    parameters: {},
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute() {
      const agents = listAgents(forge.stateFile).map(summary)
      return agents.length ? JSON.stringify(agents, null, 2) : 'No agents provisioned yet.'
    },
  }))

  ctx.tools.register(defineTool({
    name: 'forge_provision_agent',
    description:
      'Create a new agent identity (its own private GitHub App). Returns a URL the human must open and approve once; ' +
      'after that the callback listener finishes automatically. Requires publicUrl to be configured.',
    parameters: {
      name: { type: 'string', required: true, description: 'Agent slug: lowercase letters, digits, hyphens; 3-30 chars.' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      if (!NAME_PATTERN.test(args.name)) throw new Error('name must match [a-z0-9-]{3,30}')
      void ensureListener(forge)
      const url = provisionUrl(forge, args.name)
      return [
        `Provisioning session started for "${args.name}".`,
        `Ask the user to open and approve this URL (one click):`,
        url,
        `The session completes automatically when GitHub redirects back.`,
      ].join('\n')
    },
  }))

  ctx.tools.register(defineTool({
    name: 'forge_agent_token',
    description: 'Mint a short-lived (~1h) GitHub installation token for an active agent. Refresh by calling again.',
    parameters: {
      name: { type: 'string', required: true, description: 'The agent slug.' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      const rec = getAgent(forge.stateFile, args.name)
      if (!rec || rec.status !== 'active') throw new Error(`agent "${args.name}" is not active`)
      if (!rec.installationId) throw new Error(`agent "${args.name}" has no installation yet; install the app into your org or a repo first`)
      const token = await installationToken(rec)
      return `Token for ${rec.slug}[bot] (expires in ~55 minutes):\n${token}`
    },
  }))

  ctx.tools.register(defineTool({
    name: 'forge_revoke_agent',
    description: 'Revoke an agent identity. Also removes local credentials; uninstall the app in GitHub settings to fully remove it.',
    parameters: {
      name: { type: 'string', required: true, description: 'The agent slug.' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      const rec = getAgent(forge.stateFile, args.name)
      if (!rec) throw new Error(`unknown agent "${args.name}"`)
      // Scrub credentials from local state immediately.
      delete rec.privateKeyPem
      rec.appId = undefined
      rec.installationId = undefined
      rec.status = 'revoked'
      saveAgent(forge.stateFile, rec)
      return `Agent "${args.name}" revoked locally. Uninstall at https://github.com/settings/installations to fully remove it.`
    },
  }))

  console.log(`[dsh-agent-forge] ready (state: ${forge.stateFile})`)
}
