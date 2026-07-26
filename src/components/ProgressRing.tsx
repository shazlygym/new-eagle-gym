interface Props {
  /** 0–1. */
  value: number
  label?: string
  size?: number
  stroke?: number
  className?: string
}

/**
 * A ratio you can read at a glance without parsing a number — used for program
 * adherence and week completion. Drawn as an SVG rather than a conic gradient so
 * the sweep animates smoothly and the cap stays round.
 */
export default function ProgressRing({
  value,
  label,
  size = 56,
  stroke = 5,
  className = '',
}: Props) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(1, value))

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      {/* -90° start puts zero at the top; the ring reads clockwise in both
          writing directions, which is how every clock and timer behaves. */}
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-ink-500"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          className="text-brand-500 transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>

      {label && (
        <span className="tabular absolute inset-0 flex items-center justify-center text-[11px] font-bold text-ink-50">
          {label}
        </span>
      )}
    </div>
  )
}
