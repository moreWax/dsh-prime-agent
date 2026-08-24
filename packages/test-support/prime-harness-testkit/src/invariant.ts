/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-prime-harness-testkit`.
 * @module @deepseek-ai/dsh-prime-harness-testkit/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-prime-harness-testkit'

export const name = 'prime-harness-testkit-invariant'
export const inject = ['invariants']

/** Test-only package: no runtime invariants of its own. */
const install: InvariantInstaller = () => {}

export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
