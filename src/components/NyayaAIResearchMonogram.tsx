// Nyaya AI Advocate Research monogram: gold open book with a small
// scales-of-justice detail on black. Used for the Advocate Research
// header and assistant message avatars.

interface NyayaAIResearchMonogramProps {
  size?: number
  radius?: number | string
}

export default function NyayaAIResearchMonogram({
  size = 34,
  radius = 10,
}: NyayaAIResearchMonogramProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Nyaya AI Advocate Research"
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

      {/* Open book */}
      <g
        stroke="#C27635"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M24 40C20 36 14 35 8 36V21C14 20 20 21 24 25Z" />
        <path d="M24 40C28 36 34 35 40 36V21C34 20 28 21 24 25Z" />
      </g>
    </svg>
  )
}
