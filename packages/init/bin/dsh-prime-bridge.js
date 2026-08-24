#!/usr/bin/env node
/**
 * dsh-prime-bridge init — prerequisite checkup + guided install.
 *
 * Checks each dependency of the learning loop, offers y/n installation for
 * what's missing, and never runs unless invoked explicitly (CI-safe).
 */
import { execSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'

const CHECKS = [
  {
    id: 'harness',
    label: 'DeepSeek Harness (dsh)',
    why: 'the host application these plugins plug into',
    ok: () => which('dsh'),
    installHint: () => 'npm i -g @deepseek-ai/dsh',
    autoInstallable: true,
  },
  {
    id: 'prime',
    label: 'Prime Agent',
    why: 'source of durable memories and the refine inbox (~/.prime/agent)',
    ok: () => existsSync(join(homedir(), '.prime', 'agent')),
    installHint: () => 'see https://github.com/prime-agent — install, then run once to create ~/.prime/agent',
    autoInstallable: false,
  },
  {
    id: 'wiki',
    label: 'OKF/OpenWiki knowledge bundle',
    why: 'markdown pages with kind/status frontmatter served as skills',
    ok: () => (process.env.DSH_OKF_BUNDLES ?? '').length > 0 || existsSync(join(homedir(), 'my-wiki')),
    installHint: () => 'none needed — we can scaffold ~/my-wiki with a starter page',
    autoInstallable: true,
    scaffold: scaffoldWiki,
  },
  {
    id: 'dspy',
    label: 'DSPy (python)',
    why: 'offline routing optimizer in refine/',
    ok: () => python('-c', 'import dspy'),
    installHint: () => 'pip install dspy-ai',
    autoInstallable: true,
  },
]

function which(bin) {
  try { return spawnSync('which', [bin], { stdio: 'ignore' }).status === 0 } catch { return false }
}
function python(...args) {
  try { return spawnSync('python3', args, { stdio: 'ignore' }).status === 0 } catch { return false }
}
function scaffoldWiki() {
  const dir = join(homedir(), 'my-wiki', 'skills')
  const page = [
    '---', 'kind: skill', 'status: verified', 'description: Starter page from dsh-prime-bridge init', '---', '',
    '# Hello knowledge', 'Edit this page or add more — every kind-declaring page becomes an agent skill.', '',
  ].join('\n')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'hello-knowledge.md'), page)
}

async function ask(rl, q) {
  const a = (await rl.question(`${q} [y/N] `)).trim().toLowerCase()
  return a === 'y' || a === 'yes'
}

async function main() {
  console.log('dsh-prime-bridge init — checking your setup\n')
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  let missing = []

  for (const c of CHECKS) {
    process.stdout.write(`checking ${c.label} … `)
    const good = c.ok()
    console.log(good ? 'ok' : 'MISSING')
    if (!good) missing.push(c)
  }

  if (missing.length === 0) {
    console.log('\nAll prerequisites present. dsh web --no-open and open the / skill menu.')
    rl.close()
    return
  }

  console.log('')
  for (const c of missing) {
    console.log(`\n${c.label} — ${c.why}`)
    if (!(await ask(rl, `  Install / set up now?`))) {
      console.log(`  skipped. when ready: ${c.installHint()}`)
      continue
    }
    if (c.scaffold !== undefined) {
      c.scaffold()
      console.log('  scaffolded.')
      continue
    }
    if (c.autoInstallable) {
      const cmd = c.installHint()
      console.log(`  running: ${cmd}`)
      try { execSync(cmd, { stdio: 'inherit' }) } catch { console.log(`  failed — run manually: ${cmd}`) }
    } else {
      console.log(`  do this manually: ${c.installHint()}`)
      await rl.question('  press enter when done … ')
    }
  }

  rl.close()
  console.log('\ndone. re-run `npx @morewax/dsh-prime-bridge init` any time to re-check.')
}

main()
