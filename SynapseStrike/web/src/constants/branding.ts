// SynapseStrike Official Branding Constants

// Export official links
export const OFFICIAL_LINKS = {
  github: 'https://github.com/poorman/SynapseStrike',
} as const

// Brand watermark component data
export const BRAND_INFO = {
  name: 'SynapseStrike',
  tagline: 'AI Trading Platform',
  version: '1.0.0',
  social: {
    gh: () => OFFICIAL_LINKS.github,
  }
} as const
