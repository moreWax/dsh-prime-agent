import { readFile, readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { firstHeading, parseFrontmatter } from './markdown.js'

export interface WikiPage {
  name: string
  path: string
  description: string
  verified: boolean
}

/** Filesystem boundary and traversal policy for OKF bundle pages. */
export class OkfPageRepository {
  constructor(private readonly maxDepth = 5) {}

  async collect(root: string): Promise<WikiPage[]> {
    const pages: WikiPage[] = []
    await this.walk(resolve(root), 0, pages)
    return pages
  }

  private async walk(dir: string, depth: number, pages: WikiPage[]): Promise<void> {
    if (depth > this.maxDepth) return
    let items
    try { items = await readdir(dir, { withFileTypes: true }) } catch { return }
    for (const item of items) {
      const path = join(dir, item.name)
      if (item.isDirectory()) await this.walk(path, depth + 1, pages)
      else if (/\.md$/.test(item.name) && !/\.zh\.md$/.test(item.name)) {
        const raw = await readFile(path, 'utf8').catch(() => '')
        if (!raw) continue
        const { meta, body } = parseFrontmatter(raw)
        if (meta.kind === undefined) continue
        pages.push({
          name: item.name.replace(/\.md$/, ''), path,
          description: meta.description ?? firstHeading(body),
          verified: meta.status === 'verified',
        })
      }
    }
  }
}
