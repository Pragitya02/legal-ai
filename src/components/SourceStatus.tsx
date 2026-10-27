import type { CitationMeta } from '../lib/citations'

interface SourceStatusProps {
  meta?: CitationMeta | null
}

/*
 * Compact status line under a freshly generated AI answer. It only reports
 * what the backend supplied; the full list of links lives in the answer's
 * "Sources & References" section, so it also survives chat-history reloads.
 */
export default function SourceStatus({ meta }: SourceStatusProps) {
  if (!meta) return null

  const statutes = meta.citations.filter((c) => c.kind === 'statute')
  const web = meta.citations.filter((c) => c.kind === 'web' && c.cited)

  if (statutes.length === 0 && web.length === 0 && meta.notices.length === 0) {
    return null
  }

  const verified = meta.sourcesVerified && statutes.length > 0

  const parts: string[] = []

  if (statutes.length > 0) {
    parts.push(
      `${statutes.length} legal provision${statutes.length === 1 ? '' : 's'} ` +
        `from the Nyaya AI legal knowledge base`,
    )
  }

  if (web.length > 0) {
    parts.push(
      `${web.length} web result${web.length === 1 ? '' : 's'} ` +
        `(not independently verified)`,
    )
  }

  return (
    <div
      className="source-status"
      data-state={verified ? 'verified' : 'unverified'}
      role="note"
    >
      <span aria-hidden="true">{verified ? '✓' : '!'}</span>
      <span>
        {parts.length > 0
          ? `Sources: ${parts.join(' · ')}.`
          : 'Sources could not be verified for this response. ' +
            'Please consult the relevant official legal source before ' +
            'relying on this information.'}
      </span>
    </div>
  )
}
