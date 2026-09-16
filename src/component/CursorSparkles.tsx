import { useEffect } from 'react'

export default function CursorSparkles() {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const sparkle = document.createElement('span')

      sparkle.className = 'cursor-sparkle'

      const size = Math.random() * 4 + 2

      sparkle.style.left = `${e.clientX}px`
      sparkle.style.top = `${e.clientY}px`
      sparkle.style.width = `${size}px`
      sparkle.style.height = `${size}px`

      document.body.appendChild(sparkle)

      setTimeout(() => {
        sparkle.remove()
      }, 700)
    }

    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return null
}