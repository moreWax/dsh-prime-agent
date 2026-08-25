/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-prime-agent-testkit`.
 * @module @deepseek-ai/dsh-prime-agent-testkit/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-prime-agent-testkit'

export const name = 'prime-agent-testkit-invariant'
export const inject = ['invariants']

/** Test-only package: no runtime invariants of its own. */
const install: InvariantInstaller = () => {}

export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
