export interface ParsedMarkdown {
  meta: Record<string, string>
  body: string
}

/** Parse the deliberately small scalar subset used by OKF frontmatter. */
export function parseFrontmatter(raw: string): ParsedMarkdown {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/)
  const meta: Record<string, string> = {}
  if (!match?.[1]) return { meta, body: raw }
  for (const line of match[1].split('\n')) {
    const pair = line.match(/^(\w[\w-]*):\s*(.+)$/)
    if (pair?.[1] !== undefined && pair[2] !== undefined) meta[pair[1]] = pair[2].trim()
  }
  return { meta, body: raw.slice(match[0].length) }
}

export function firstHeading(body: string): string {
  return body.split('\n').find(line => line.startsWith('# '))?.replace(/^#\s*/, '') ?? ''
}
