import { useEffect, useRef, useState } from 'react'

type CursorState = 'default' | 'hover' | 'click' | 'loading' | 'move' | 'disabled' | 'busy' | 'text'

/** Custom image-based gavel cursor with a two-second click effect. */
export default function GavelCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 })
  const [state, setState] = useState<CursorState>('default')
  const clickResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestPosition = useRef({ x: -100, y: -100 })

  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    if (!finePointer.matches) return

    const getRestingState = (target: Element | null): CursorState => {
      if (!target) return 'default'
      if (target.closest('input, textarea, [contenteditable="true"], select')) return 'text'
      if (target.closest('[aria-busy="true"], [data-loading="true"], .loading, .is-loading, .spinner')) return 'loading'
      if (target.closest('[aria-disabled="true"], :disabled, .disabled, [data-disabled="true"]')) return 'disabled'
      if (target.closest('[draggable="true"], [data-cursor="move"], .cursor-move')) return 'move'
      if (target.closest('[data-busy="true"], [data-working="true"]')) return 'busy'
      if (target.closest('a, button, [role="button"], [role="link"], summary, label, input[type="checkbox"], input[type="radio"]')) return 'hover'
      return 'default'
    }

    const onMove = (event: PointerEvent) => {
      latestPosition.current = { x: event.clientX, y: event.clientY }
      setPosition(latestPosition.current)
      // Keep the click pose active for two seconds, even if the pointer moves.
      if (clickResetTimer.current) {
        setState('click')
        return
      }
      const target = event.target instanceof Element ? event.target : null
      setState(getRestingState(target))
    }

    const onDown = () => {
      setState('click')
      if (clickResetTimer.current) clearTimeout(clickResetTimer.current)
      clickResetTimer.current = setTimeout(() => {
        clickResetTimer.current = null
        const { x, y } = latestPosition.current
        setState(getRestingState(document.elementFromPoint(x, y)))
      }, 2000)
    }

    const onBlur = () => {
      if (clickResetTimer.current) clearTimeout(clickResetTimer.current)
      clickResetTimer.current = null
      setState('default')
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('blur', onBlur)
      if (clickResetTimer.current) clearTimeout(clickResetTimer.current)
    }
  }, [])

  const imageForState: Record<CursorState, string> = {
    default: '/gavel-custom-cursor.png',
    hover: '/gavel-custom-cursor.png',
    click: '/gavel-custom-cursor.png',
    loading: '/gavel-custom-cursor.png',
    move: '/gavel-custom-cursor.png',
    disabled: '/gavel-custom-cursor.png',
    busy: '/gavel-custom-cursor.png',
    text: '/gavel-custom-cursor.png',
  }

  return (
    <div
      aria-hidden="true"
      className={`gavel-cursor gavel-cursor--${state}`}
      style={{ left: position.x, top: position.y }}
    >
      <img src={imageForState[state]} alt="" draggable="false" />
    </div>
  )
}
