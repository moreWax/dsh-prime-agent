import { readFileSync } from 'node:fs'
import jwt from 'jsonwebtoken'
import type { AgentRecord } from './types.js'

/** App-auth JWT for a GitHub App (accepted for at most 10 minutes). */
export function appJwt(appId: string | number, pem: string): string {
  const now = Math.floor(Date.now() / 1000)
  return jwt.sign({ iss: String(appId), iat: now - 60, exp: now + 540 }, pem, { algorithm: 'RS256' })
}

export function authedFetch(appId: string | number, pem: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${appJwt(appId, pem)}`,
      'user-agent': 'dsh-agent-forge',
      ...(init?.headers ?? {}),
    },
  })
}

/** Mint a short-lived installation access token usable by the agent runtime. */
export async function installationToken(agent: AgentRecord): Promise<string> {
  const res = await authedFetch(agent.appId!, agent.privateKeyPem!,
    `/app/installations/${agent.installationId}/access_tokens`, { method: 'POST' })
  if (!res.ok) throw new Error(`token mint failed: ${res.status} ${await res.text()}`)
  return ((await res.json()) as { token: string }).token
}
