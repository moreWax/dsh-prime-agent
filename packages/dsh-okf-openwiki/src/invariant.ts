/** Package-owned invariant companion. @module @deepseek-ai/dsh-okf-openwiki/invariant */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-okf-openwiki'
export const name = 'okf-openwiki-invariant'
export const inject = ['invariants']

/** Contracts live at the ctx.skills seam; no independent event sequence. */
const install: InvariantInstaller = () => {}

export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
