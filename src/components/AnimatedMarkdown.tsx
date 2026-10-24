import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface AnimatedMarkdownProps {
  content: string
  animate?: boolean
  speed?: number
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

  const visibleContent = safeContent.slice(0, visibleLength)
  const isRevealing = animate && visibleLength < safeContent.length

  return (
    <motion.div
      initial={animate ? { opacity: 0.45 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{ position: 'relative' }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
