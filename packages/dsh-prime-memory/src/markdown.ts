/** Small frontmatter helpers shared by catalog list/get paths. */
export function frontmatterDescription(raw: string): string {
  const match = raw.match(/^---\n([\s\S]*?)\n---/)
  const description = match?.[1]?.match(/^description:\s*(.+)$/m)?.[1]
  return description?.trim() ?? firstHeading(raw)
}

export function firstHeading(raw: string): string {
  return raw.split('\n').find(line => line.startsWith('# '))?.replace(/^#\s*/, '') ?? ''
}

export function stripFrontmatter(raw: string): string {
  return raw.replace(/^---\n[\s\S]*?\n---\n?/, '')
}
