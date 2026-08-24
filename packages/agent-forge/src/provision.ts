import { randomBytes } from 'node:crypto'
import type { ForgeConfig } from './types.js'
import { getAgent, saveAgent } from './store.js'

interface PendingEntry {
  name: string
  state: string
}

const pending = new Map<string, PendingEntry>()
let listenerStarted = false

/**
 * GitHub's "create app from manifest" flow:
 * 1. Build a manifest describing the agent's own private GitHub App.
 * 2. Return a URL; the human approves ONCE in the browser (GitHub requires this).
 * 3. GitHub redirects to our callback with a one-time code.
 * 4. The code is exchanged for real credentials; everything after that is automatic.
 */
export function provisionUrl(config: ForgeConfig, name: string): string {
  const publicUrl = config.publicUrl
  if (!publicUrl) throw new Error('publicUrl is not configured: set it to an address github.com can reach')

  const webhookSecret = randomBytes(24).toString('hex')
  const state = randomBytes(12).toString('hex')
  saveAgent(config.stateFile, {
    name, webhookSecret,
    createdAt: new Date().toISOString(),
    status: 'pending',
  })
  pending.set(state, { name, state })

  const manifest = {
    name: `agent-${name}`,
    url: publicUrl,
    hook_attributes: { url: `${publicUrl}/hooks/${name}`, active: false },
    redirect_url: `${publicUrl}/callback`,
    callback_urls: [`${publicUrl}/callback`],
    setup_url: `${publicUrl}/setup?agent=${name}`,
    description: `Autonomous agent identity: ${name} (managed by dsh-agent-forge)`,
    public: false,
    default_permissions: { contents: 'write', issues: 'write', pull_requests: 'write', metadata: 'read' },
    default_events: ['issues', 'pull_request', 'push'],
  }
  return `https://github.com/settings/apps/new?state=${encodeURIComponent(state)}&manifest=${encodeURIComponent(JSON.stringify(manifest))}`
}

/** Idempotently start the callback listener that finishes provisioning. */
export async function ensureListener(config: ForgeConfig): Promise<void> {
  if (listenerStarted) return
  listenerStarted = true

  const { default: express } = await import('express')
  const app = express()
  app.use(express.json())

  app.get('/callback', async (req, res) => {
    const state = String(req.query.state ?? '')
    const code = String(req.query.code ?? '')
    const entry = pending.get(state)
    if (!entry || !code) return res.status(400).send('unknown or expired provisioning session')
    try {
      const conv = await fetch(`https://api.github.com/app-manifests/${code}/conversions`, {
        method: 'POST',
        headers: { accept: 'application/vnd.github+json', 'user-agent': 'dsh-agent-forge' },
      }).then(r => r.json()) as Record<string, any>

      const rec = getAgent(config.stateFile, entry.name)!
      rec.appId = conv.id
      rec.slug = conv.slug
      rec.privateKeyPem = conv.pem
      rec.webhookSecret = conv.webhook_secret ?? rec.webhookSecret
      rec.status = 'active'
      saveAgent(config.stateFile, rec)
      pending.delete(state)
      res.send(`<h1>Agent "${entry.name}" is live</h1><p>You can close this tab.</p>`)
    } catch (e) {
      res.status(500).send(`provisioning failed: ${e}`)
    }
  })

  app.listen(config.callbackPort, () => {
    console.log(`[dsh-agent-forge] callback listener on :${config.callbackPort}`)
  })
}
