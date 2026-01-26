import { Github, ExternalLink } from 'lucide-react'
import { t, Language } from '../../i18n/translations'
import { OFFICIAL_LINKS } from '../../constants/branding'

interface FooterSectionProps {
  language: Language
}

export default function FooterSection({ language }: FooterSectionProps) {
  const links = {
    social: [
      { name: 'GitHub', href: OFFICIAL_LINKS.github, icon: Github },
    ],
    resources: [
      {
        name: false ? 'docs' : 'Documentation',
        href: 'https://github.com/poorman/SynapseStrike/blob/main/README.md',
      },
      { name: 'Issues', href: 'https://github.com/poorman/SynapseStrike/issues' },
      { name: 'Pull Requests', href: 'https://github.com/poorman/SynapseStrike/pulls' },
    ],
    supporters: [
      { name: 'Aster DEX', href: 'https://www.asterdex.com/en/referral/fdfc0e' },
      { name: 'Binance', href: 'https://www.maxweb.red/join?ref=SynapseStrikeAI' },
      { name: 'Hyperliquid', href: 'https://hyperliquid.xyz/' },
      {
        name: 'Amber.ac',
        href: 'https://amber.ac/',
        badge: false ? 'strategic investment' : 'Strategic',
      },
    ],
  }

  return (
    <footer style={{ background: 'var(--bg-secondary)', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img src="/images/logo.png" alt="SynapseStrike Logo" className="w-8 h-8" />
              <span className="text-xl font-bold" style={{ color: '#F9FAFB' }}>
                SynapseStrike
              </span>
            </div>
            <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
              {t('futureStandardAI', language)}
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-3">
              {links.social.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#9CA3AF',
                  }}
                  title={link.name}
                >
                  <link.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold mb-4" style={{ color: '#F9FAFB' }}>
              {t('links', language)}
            </h4>
            <ul className="space-y-3">
              {links.social.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm transition-colors hover:text-[var(--primary)]"
                    style={{ color: '#6B7280' }}
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold mb-4" style={{ color: '#F9FAFB' }}>
              {t('resources', language)}
            </h4>
            <ul className="space-y-3">
              {links.resources.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm transition-colors hover:text-[var(--primary)] inline-flex items-center gap-1"
                    style={{ color: '#6B7280' }}
                  >
                    {link.name}
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Supporters */}
          <div>
            <h4 className="text-sm font-semibold mb-4" style={{ color: '#F9FAFB' }}>
              {t('supporters', language)}
            </h4>
            <ul className="space-y-3">
              {links.supporters.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm transition-colors hover:text-[var(--primary)] inline-flex items-center gap-2"
                    style={{ color: '#6B7280' }}
                  >
                    {link.name}
                    {link.badge && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          background: 'var(--primary-bg, 0.1)',
                          color: 'var(--primary)',
                        }}
                      >
                        {link.badge}
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div
          className="pt-6 text-center text-xs"
          style={{ color: '#6B7280', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          <p className="mb-2">{t('footerTitle', language)}</p>
          <p style={{ color: '#3C4249' }}>{t('footerWarning', language)}</p>
        </div>
      </div>
    </footer>
  )
}
