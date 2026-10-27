/*
 * Citation helpers for the AI Assistant and AI Research pages.
 *
 * The BACKEND builds and validates citation metadata. The frontend only
 * (a) re-checks that links are safe to open and (b) tolerates malformed or
 * missing data without throwing.
 */

export interface Citation {
  n: number
  id: string
  kind: 'statute' | 'web'
  title: string
  url: string
  sourceName: string
  tier: 'official' | 'legal_database' | 'other'
  status: string
  verified: boolean
  cited: boolean
  section?: string
  sectionTitle?: string
  effectiveDate?: string
}

export interface CitationMeta {
  citations: Citation[]
  sourcesVerified: boolean
  notices: string[]
}

export const EMPTY_CITATION_META: CitationMeta = {
  citations: [],
  sourcesVerified: false,
  notices: [],
}

/**
 * Returns the URL only when it is an absolute http(s) link without
 * credentials. Anything else (javascript:, data:, relative, malformed)
 * returns null and must be rendered as plain text.
 */
export function safeHref(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const raw = value.trim()
  if (!raw || raw.length > 2000) return null

  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    if (url.username || url.password) return null
    return url.toString()
  } catch {
    return null
  }
}

function asString(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.slice(0, max) : ''
}

/**
 * Accepts whatever the API returned and produces a safe CitationMeta.
 * Never throws.
 */
export function parseCitationMeta(data: unknown): CitationMeta {
  try {
    const source = (data ?? {}) as Record<string, unknown>

    const rawCitations = Array.isArray(source.citations)
      ? source.citations
      : []

    const citations: Citation[] = []

    for (const item of rawCitations) {
      if (!item || typeof item !== 'object') continue

      const c = item as Record<string, unknown>
      const title = asString(c.title, 300)
      if (!title) continue

      const tier =
        c.tier === 'official' || c.tier === 'legal_database'
          ? c.tier
          : 'other'

      citations.push({
        n: Number.isInteger(c.n) ? (c.n as number) : citations.length + 1,
        id: asString(c.id, 10),
        kind: c.kind === 'web' ? 'web' : 'statute',
        title,
        url: safeHref(c.url) ?? '',
        sourceName: asString(c.sourceName, 200),
        tier,
        status: asString(c.status, 40),
        verified: c.verified === true,
        cited: c.cited === true,
        section: asString(c.section, 50),
        sectionTitle: asString(c.sectionTitle, 300),
        effectiveDate: asString(c.effectiveDate, 20),
      })
    }

    const rawNotices = Array.isArray(source.sourceNotices)
      ? source.sourceNotices
      : []

    return {
      citations,
      sourcesVerified: source.sourcesVerified === true,
      notices: rawNotices
        .filter((n): n is string => typeof n === 'string')
        .map((n) => n.slice(0, 400))
        .slice(0, 5),
    }
  } catch {
    return EMPTY_CITATION_META
  }
}
