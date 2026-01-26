import { useMemo } from 'react'

interface PunkAvatarProps {
  seed: string
  size?: number
  className?: string
}

// Hash function to generate consistent random values from seed
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

// Get a value from hash at specific position
function getHashValue(hash: number, position: number, max: number): number {
  return ((hash >> (position * 4)) & 0xF) % max
}

// Modern gradient color combinations - brand green palette
const GRADIENT_PAIRS = [
  ['rgb(0, 200, 5)', 'rgb(195, 245, 60)'],     // Darker green to lighter green
  ['rgb(195, 245, 60)', 'rgb(204, 255, 0)'],   // Lighter green to light green
  ['rgb(0, 200, 5)', 'rgb(204, 255, 0)'],      // Darker green to light green
  ['rgb(204, 255, 0)', 'rgb(195, 245, 60)'],   // Light green to lighter green
  ['rgb(0, 200, 5)', 'rgb(0, 200, 5)'],        // Solid darker green
  ['rgb(195, 245, 60)', 'rgb(0, 200, 5)'],     // Lighter green to darker green
  ['rgb(204, 255, 0)', 'rgb(0, 200, 5)'],      // Light green to darker green
  ['rgb(0, 200, 5)', 'rgb(195, 245, 60)'],     // Darker green to lighter green (repeat for variety)
  ['rgb(195, 245, 60)', 'rgb(195, 245, 60)'],  // Solid lighter green
  ['rgb(204, 255, 0)', 'rgb(204, 255, 0)'],    // Solid light green
  ['rgb(0, 200, 5)', 'rgb(204, 255, 0)'],      // Darker to light (repeat)
  ['rgb(195, 245, 60)', 'rgb(204, 255, 0)'],   // Lighter to light (repeat)
  ['rgb(0, 200, 5)', 'rgb(195, 245, 60)'],     // Darker to lighter (repeat)
  ['rgb(204, 255, 0)', 'rgb(195, 245, 60)'],   // Light to lighter (repeat)
  ['rgb(0, 200, 5)', 'rgb(0, 200, 5)'],        // Solid darker green (repeat)
]

// Icon patterns for avatar - simple geometric shapes
const ICON_PATTERNS = ['circle', 'diamond', 'hexagon', 'star', 'triangle', 'square', 'ring', 'dots']

export function PunkAvatar({ seed, size = 40, className = '' }: PunkAvatarProps) {
  const avatar = useMemo(() => {
    const hash = hashCode(seed)

    // Deterministic selections based on hash
    const gradientPair = GRADIENT_PAIRS[getHashValue(hash, 0, GRADIENT_PAIRS.length)]
    const iconPattern = ICON_PATTERNS[getHashValue(hash, 1, ICON_PATTERNS.length)]
    const rotation = getHashValue(hash, 2, 8) * 45 // 0, 45, 90, 135, 180, 225, 270, 315
    const hasSecondary = getHashValue(hash, 3, 3) === 0

    // Generate initials from seed - the seed format is "{traderId}|{traderName}"
    // We need to extract just the trader name part and get first letters of first 2 words
    const pipeIndex = seed.indexOf('|')
    // Get the name part (everything after the pipe, which separates traderId from name)
    const namePart = pipeIndex > -1 ? seed.substring(pipeIndex + 1) : seed
    // Split name by spaces and other separators to get words (keep numbers as valid words)
    const words = namePart.split(/[\s_]+/).filter(p => p.length > 0)
    let initials = ''
    if (words.length >= 2) {
      // Take first character of first word and first character of second word
      initials = (words[0][0] + words[1][0]).toUpperCase()
    } else if (words.length === 1 && words[0].length >= 2) {
      initials = words[0].substring(0, 2).toUpperCase()
    } else {
      initials = 'AI'
    }

    return {
      gradientPair,
      iconPattern,
      rotation,
      hasSecondary,
      initials,
    }
  }, [seed])

  const renderPattern = () => {
    const { iconPattern, hasSecondary } = avatar
    const center = size / 2
    const patternSize = size * 0.3

    switch (iconPattern) {
      case 'circle':
        return (
          <>
            <circle
              cx={center}
              cy={center}
              r={patternSize}
              fill="rgba(255,255,255,0.15)"
            />
            {hasSecondary && (
              <circle
                cx={center}
                cy={center}
                r={patternSize * 0.5}
                fill="rgba(255,255,255,0.1)"
              />
            )}
          </>
        )
      case 'diamond':
        return (
          <rect
            x={center - patternSize * 0.7}
            y={center - patternSize * 0.7}
            width={patternSize * 1.4}
            height={patternSize * 1.4}
            fill="rgba(255,255,255,0.15)"
            transform={`rotate(45 ${center} ${center})`}
          />
        )
      case 'hexagon':
        const hexPoints = Array.from({ length: 6 }, (_, i) => {
          const angle = (i * 60 - 30) * Math.PI / 180
          return `${center + patternSize * Math.cos(angle)},${center + patternSize * Math.sin(angle)}`
        }).join(' ')
        return (
          <polygon
            points={hexPoints}
            fill="rgba(255,255,255,0.15)"
          />
        )
      case 'star':
        const starPoints = Array.from({ length: 10 }, (_, i) => {
          const angle = (i * 36 - 90) * Math.PI / 180
          const r = i % 2 === 0 ? patternSize : patternSize * 0.5
          return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`
        }).join(' ')
        return (
          <polygon
            points={starPoints}
            fill="rgba(255,255,255,0.15)"
          />
        )
      case 'triangle':
        const triPoints = Array.from({ length: 3 }, (_, i) => {
          const angle = (i * 120 - 90) * Math.PI / 180
          return `${center + patternSize * Math.cos(angle)},${center + patternSize * Math.sin(angle)}`
        }).join(' ')
        return (
          <polygon
            points={triPoints}
            fill="rgba(255,255,255,0.15)"
          />
        )
      case 'ring':
        return (
          <circle
            cx={center}
            cy={center}
            r={patternSize}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={size * 0.08}
          />
        )
      case 'dots':
        return (
          <>
            <circle cx={center} cy={center - patternSize * 0.6} r={size * 0.06} fill="rgba(255,255,255,0.2)" />
            <circle cx={center - patternSize * 0.5} cy={center + patternSize * 0.3} r={size * 0.06} fill="rgba(255,255,255,0.2)" />
            <circle cx={center + patternSize * 0.5} cy={center + patternSize * 0.3} r={size * 0.06} fill="rgba(255,255,255,0.2)" />
          </>
        )
      default: // square
        return (
          <rect
            x={center - patternSize * 0.7}
            y={center - patternSize * 0.7}
            width={patternSize * 1.4}
            height={patternSize * 1.4}
            fill="rgba(255,255,255,0.15)"
            rx={size * 0.05}
          />
        )
    }
  }

  const gradientId = `avatar-gradient-${seed.replace(/[^a-zA-Z0-9]/g, '')}`
  const borderRadius = size * 0.2

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{
        borderRadius: borderRadius,
        overflow: 'hidden'
      }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={avatar.gradientPair[0]} />
          <stop offset="100%" stopColor={avatar.gradientPair[1]} />
        </linearGradient>
      </defs>

      {/* Background gradient */}
      <rect
        width={size}
        height={size}
        fill={`url(#${gradientId})`}
        rx={borderRadius}
      />

      {/* Decorative pattern */}
      <g transform={`rotate(${avatar.rotation} ${size / 2} ${size / 2})`}>
        {renderPattern()}
      </g>

      {/* Initials text */}
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fill="#000"
        fontSize={size * 0.38}
        fontWeight="600"
        fontFamily="'Capsule Sans Text', system-ui, sans-serif"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
      >
        {avatar.initials}
      </text>
    </svg>
  )
}

// Pre-defined avatars for special traders
export function getTraderAvatar(traderId: string, traderName: string): string {
  // Use pipe separator so dashes in UUID don't interfere with parsing
  return `${traderId}|${traderName}`
}
