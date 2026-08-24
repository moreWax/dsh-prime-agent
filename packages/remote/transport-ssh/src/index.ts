/**
 * SSH transport provider: exec and file IO over the local OpenSSH client.
 * @module @deepseek-ai/dsh-transport-ssh
 */
import { spawn } from 'node:child_process'
import type { Context } from '@deepseek-ai/cordis'
import { RemoteTransport, shellQuote } from '@morewax/dsh-remote-transport'
import type { TransportExecRequest, TransportExecResult } from '@morewax/dsh-remote-transport'

export interface Config {
  /** Remote host (required). */
  host: string
  /** Remote user; omitted uses your ssh config. */
  user?: string
  /** SSH port. */
  port?: number
  /** Extra ssh args (IdentityFile, Jump Host, …). */
  sshArgs?: string[]
  /** Default command timeout in ms. */
  defaultTimeoutMs?: number
}

const BASE_ARGS = ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10']

/** Single-quote for POSIX shells. */
/** Collect one spawned child into a TransportExecResult with timeout + abort. */
export function collect(
  child: ReturnType<typeof spawn>,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<TransportExecResult> {
  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM') }, timeoutMs)
    const onAbort = () => { if (!timedOut) child.kill('SIGTERM') }
    signal?.addEventListener('abort', onAbort, { once: true })
    child.stdout?.on('data', (d) => { stdout += String(d) })
    child.stderr?.on('data', (d) => { stderr += String(d) })
    child.on('error', (e) => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      resolve({ exitCode: null, signal: null, stdout: '', stderr: String(e) })
    })
    child.on('close', (code, closingSignal) => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      resolve({
        exitCode: timedOut ? null : code,
        signal: timedOut || abortedNow(signal) ? 'SIGTERM' : closingSignal,
        stdout,
        stderr: timedOut ? `${stderr}\n[dsh] killed after ${timeoutMs}ms timeout` : stderr,
      })
    })
  })
}

function abortedNow(signal?: AbortSignal): boolean {
  return signal?.aborted === true
}

export class SshTransport extends RemoteTransport {
  readonly driver = 'ssh' as const

  constructor(ctx: Context, private readonly cfg: Required<Pick<Config, 'host'>> & Config) {
    super(ctx, 'remoteTransport')
  }

  private target(): string {
    return this.cfg.user ? `${this.cfg.user}@${this.cfg.host}` : this.cfg.host
  }

  private runChild(args: string[], opts: { stdin?: string | undefined } = {}) {
    const child = spawn('ssh', [...BASE_ARGS, ...this.cfg.sshArgs ?? [], this.target(), ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    child.stdin.end(opts.stdin ?? '')
    return child
  }

  exec(request: TransportExecRequest): Promise<TransportExecResult> {
    // The command rides stdin into `bash -s`: exactly ONE remote shell layer,
    // so consumer scripts may contain any quoting without double-parse issues.
    const preamble =
      request.workdir !== undefined ? `cd ${shellQuote(request.workdir)} || exit 97\n` : ''
    const child = this.runChild(['bash', '-s'], { stdin: `${preamble}${request.command}\n` })
    return collect(child, request.timeoutMs ?? this.cfg.defaultTimeoutMs ?? 120000, request.signal)
  }

  async readFile(path: string, maxBytes: number, signal?: AbortSignal): Promise<Uint8Array> {
    // head -c caps transfer; base64 keeps binary payloads safe across the channel.
    const child = this.runChild(['bash', '-s'], {
      stdin: `head -c ${maxBytes} ${shellQuote(path)} | base64\n`,
    })
    const r = await collect(child, this.cfg.defaultTimeoutMs ?? 120000, signal)
    if (r.exitCode !== 0) throw new Error(`ssh read failed (${r.exitCode}): ${r.stderr.slice(0, 400)}`)
    return new Uint8Array(Buffer.from(r.stdout.replace(/\s+/g, ''), 'base64'))
  }

  async writeFileAtomic(path: string, bytes: Uint8Array, signal?: AbortSignal): Promise<void> {
    const dir = path.replace(/[^/]*$/, '')
    const tmp = `${path}.dsh-tmp.$$`
    // payload travels on stdin as base64; the script decodes and publishes atomically
    const b64 = Buffer.from(bytes).toString('base64')
    const script =
      `mkdir -p ${shellQuote(dir)} && ` +
      `printf %s ${shellQuote(b64)} | base64 -d > ${shellQuote(tmp)} && mv -f ${shellQuote(tmp)} ${shellQuote(path)}`
    const result = await this.exec({ command: script, signal })
    if (result.exitCode !== 0) {
      throw new Error(`ssh write failed (${result.exitCode}): ${result.stderr.slice(0, 400)}`)
    }
  }

  streamInteractive(command: string): { child: ReturnType<typeof spawn> } {
    const child = spawn('ssh', ['-t', ...BASE_ARGS, ...this.cfg.sshArgs ?? [], this.target(), shellQuote(command)], {
      stdio: 'inherit',
    })
    return { child }
  }
}

export const name = 'transport-ssh'
export const inject = [] as const

export function apply(ctx: Context, config: Config): void {
  ctx.remoteTransport = new SshTransport(ctx, config)
}
