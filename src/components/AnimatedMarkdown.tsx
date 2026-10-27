import { Children, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { safeHref } from '../lib/citations'

interface AnimatedMarkdownProps {
  content: string
  animate?: boolean
  speed?: number
}

/*
 * While text is being revealed, avoid showing half of a markdown link such as
 * "[1](https://www.indiaco". If the visible slice ends inside a link target,
 * extend it to the closing ")" so the link appears in one step.
 */
function completeOpenLink(full: string, visible: string): string {
  const open = visible.lastIndexOf('](')
  if (open === -1) return visible
  if (visible.indexOf(')', open) !== -1) return visible

  const close = full.indexOf(')', open)
  return close === -1 ? visible : full.slice(0, close + 1)
}

function nodeText(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => (typeof child === 'string' ? child : ''))
    .join('')
}

/*
 * react-markdown does not render raw HTML (no rehype-raw), and every link is
 * re-validated here: only absolute http(s) URLs become anchors.
 */
const markdownComponents: Components = {
  a({ href, children }) {
    const safe = safeHref(href)

    if (!safe) {
      return <span>{children}</span>
    }

    // "[1]" style citation markers get a compact chip.
    const isCitationMarker = /^\[\d{1,2}\]$/.test(nodeText(children).trim())

    return (
      <a
        href={safe}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className={isCitationMarker ? 'legal-cite' : 'legal-link'}
      >
        {children}
      </a>
    )
  },

  // Wide tables scroll inside their own container instead of the page.
  table({ children }) {
    return (
      <div className="legal-table-wrap" role="region" tabIndex={0}>
        <table>{children}</table>
      </div>
    )
  },
}

export default function AnimatedMarkdown({
  content,
  animate = false,
  speed = 12,
}: AnimatedMarkdownProps) {
  const safeContent = String(content ?? '')
  const [visibleLength, setVisibleLength] = useState(
    animate ? 0 : safeContent.length,
  )
  const frameRef = useRef<number | null>(null)
  const targetRef = useRef(safeContent.length)
  const visibleRef = useRef(animate ? 0 : safeContent.length)

  useEffect(() => {
    targetRef.current = safeContent.length

    if (!animate) {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      visibleRef.current = safeContent.length
      setVisibleLength(safeContent.length)
      return
    }

    visibleRef.current = 0
    setVisibleLength(0)

    let lastTime = performance.now()
    let accumulator = 0

    const tick = (now: number) => {
      const elapsed = now - lastTime
      lastTime = now
      accumulator += elapsed

      const charactersPerSecond = Math.max(90, speed * 16)
      const amount = Math.max(
        1,
        Math.floor((accumulator / 1000) * charactersPerSecond),
      )

      if (amount > 0) {
        accumulator = 0
        const next = Math.min(
          visibleRef.current + amount,
          targetRef.current,
        )
        visibleRef.current = next
        setVisibleLength(next)

        if (next >= targetRef.current) {
          frameRef.current = null
          return
        }
      }

      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [safeContent, animate, speed])

  const isRevealing = animate && visibleLength < safeContent.length

  const visibleContent = isRevealing
    ? completeOpenLink(safeContent, safeContent.slice(0, visibleLength))
    : safeContent.slice(0, visibleLength)

  return (
    <motion.div
      className="legal-md"
      initial={animate ? { opacity: 0.45 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{ position: 'relative' }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {visibleContent}
      </ReactMarkdown>

      {isRevealing && (
        <motion.span
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            display: 'inline-block',
            width: 7,
            height: 16,
            marginLeft: 3,
            verticalAlign: '-2px',
            borderRadius: 2,
            background: 'var(--blue)',
          }}
        />
      )}
    </motion.div>
  )
}
