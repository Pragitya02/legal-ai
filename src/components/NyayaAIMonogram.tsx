// Nyaya AI monogram: gold "N" with a small scales-of-justice detail on black.
// Used for the AI Assistant header and assistant message avatars.

interface NyayaAIMonogramProps {
  size?: number
  radius?: number | string
}

export default function NyayaAIMonogram({
  size = 34,
  radius = 10,
}: NyayaAIMonogramProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Nyaya AI"
      style={{
        display: 'block',
        flexShrink: 0,
        borderRadius: radius,
      }}
    >
      <rect width="48" height="48" fill="#080808" />

      {/* Scales of justice: beam, centre post, hanging pans */}
      <g
        stroke="#C27635"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M14 10H34" />
        <path d="M24 7V10" />
        <path d="M16 10V14M32 10V14" />
        <path d="M13 14H19M29 14H35" />
      </g>

      {/* Letter N */}
      <path
        d="M14 40V20L34 40V20"
        stroke="#C27635"
        strokeWidth="4"
        strokeLinejoin="miter"
        strokeLinecap="butt"
        fill="none"
      />
    </svg>
  )
}
