import React from 'react'

interface IconProps {
  width?: number
  height?: number
  className?: string
}

// Stock brokerage icon paths
const ICON_PATHS: Record<string, string> = {
  alpaca: '/brokerage-icons/alpaca.svg',
  'alpaca-paper': '/brokerage-icons/alpaca.svg',
  ibkr: '/brokerage-icons/ibkr.svg',
  simplefx: '/brokerage-icons/simplefx.svg',
  oanda: '/brokerage-icons/oanda.svg',
}

// Generic icon component
const BrokerageImage: React.FC<IconProps & { src: string; alt: string }> = ({
  width = 24,
  height = 24,
  className,
  src,
  alt,
}) => (
  <div
    className={className}
    style={{
      width,
      height,
      borderRadius: 6,
      overflow: 'hidden',
      flexShrink: 0,
      background: 'rgba(255, 255, 255, 0.08)',
    }}
  >
    <img
      src={src}
      alt={alt}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }}
    />
  </div>
)

// Fallback icon
const FallbackIcon: React.FC<IconProps & { label: string }> = ({
  width = 24,
  height = 24,
  className,
  label,
}) => (
  <div
    className={className}
    style={{
      width,
      height,
      borderRadius: 6,
      background: 'var(--primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: Math.max(10, (width || 24) * 0.4),
      fontWeight: 'bold',
      color: '#000',
      flexShrink: 0,
    }}
  >
    {label[0]?.toUpperCase() || '?'}
  </div>
)

// Get brokerage icon function
export const getBrokerageIcon = (
  brokerageType: string,
  props: IconProps = {}
) => {
  const lowerType = brokerageType.toLowerCase()
  const type = lowerType.includes('alpaca-paper') || lowerType.includes('alpaca_paper')
    ? 'alpaca-paper'
    : lowerType.includes('alpaca')
      ? 'alpaca'
      : lowerType.includes('ibkr') || lowerType.includes('interactive')
        ? 'ibkr'
        : lowerType.includes('simplefx')
          ? 'simplefx'
          : lowerType.includes('oanda')
            ? 'oanda'
            : lowerType

  const iconProps = {
    width: props.width || 24,
    height: props.height || 24,
    className: props.className,
  }

  const path = ICON_PATHS[type]
  if (path) {
    return <BrokerageImage {...iconProps} src={path} alt={type} />
  }

  return <FallbackIcon {...iconProps} label={type} />
}
