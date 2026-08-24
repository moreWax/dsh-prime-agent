/** One provisioned agent identity. */
export interface AgentRecord {
  /** Slug, e.g. `atlas`. The GitHub identity becomes `agent-atlas[bot]`. */
  name: string
  appId?: number
  slug?: string
  privateKeyPem?: string
  webhookSecret?: string
  installationId?: number
  createdAt: string
  status: 'pending' | 'active' | 'revoked'
}

export interface ForgeConfig {
  /** JSON file holding the agent registry. */
  stateFile: string
  /** Root directory for per-agent workspaces. */
  workspaceRoot: string
  /** Port for the one-time provisioning callback listener. */
  callbackPort: number
  /**
   * Base URL GitHub redirects to after the one-click approval.
   * MUST be reachable from github.com (Tailscale address or public tunnel).
   */
  publicUrl?: string
  /** Org to auto-install new agent apps into (requires a configured manager app). */
  org?: string
  /** A hand-created GitHub App used to auto-install agent apps without UI clicks. */
  managerAppId?: string
  managerPrivateKeyPath?: string
}
